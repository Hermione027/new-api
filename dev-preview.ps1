param(
    [ValidateSet('start', 'stop', 'restart', 'status')]
    [string]$Action = 'start',
    [switch]$SkipInstall,
    [switch]$SkipFrontendBuild
)

$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$FrontendDir = Join-Path $RepoRoot 'web'
$RuntimeDir = Join-Path $RepoRoot 'runtime'

$BackendPidFile = Join-Path $RuntimeDir 'backend.pid'
$FrontendPidFile = Join-Path $RuntimeDir 'frontend.pid'
$BackendOutLog = Join-Path $RuntimeDir 'backend.out.log'
$BackendErrLog = Join-Path $RuntimeDir 'backend.err.log'
$FrontendOutLog = Join-Path $RuntimeDir 'frontend.out.log'
$FrontendErrLog = Join-Path $RuntimeDir 'frontend.err.log'

$BackendUrl = 'http://127.0.0.1:3000/'
$FrontendUrl = 'http://127.0.0.1:5173/'
$BackendPort = 3000
$FrontendPort = 5173

function Get-VersionValue {
    $versionFile = Join-Path $RepoRoot 'VERSION'
    if (-not (Test-Path -LiteralPath $versionFile)) {
        return ''
    }

    $raw = Get-Content -LiteralPath $versionFile -Raw -ErrorAction SilentlyContinue
    if ($null -eq $raw) {
        return ''
    }

    return ([string]$raw).Trim()
}

function Get-PidFromFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        return $null
    }

    $raw = Get-Content -LiteralPath $Path -Raw -ErrorAction SilentlyContinue
    if ($null -eq $raw) {
        return $null
    }

    $raw = ([string]$raw).Trim()
    if (-not $raw) {
        return $null
    }

    $parsed = 0
    if ([int]::TryParse($raw, [ref]$parsed)) {
        return $parsed
    }
    return $null
}

function Set-PidFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [Parameter(Mandatory = $true)]
        [int]$ProcessId
    )

    Set-Content -LiteralPath $Path -Value $ProcessId -NoNewline
}

function Remove-PidFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (Test-Path -LiteralPath $Path) {
        Remove-Item -LiteralPath $Path -Force
    }
}

function Clear-LogFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (Test-Path -LiteralPath $Path) {
        Remove-Item -LiteralPath $Path -Force
    }
}

function Get-ChildProcessIdsRecursive {
    param(
        [Parameter(Mandatory = $true)]
        [int]$ParentId
    )

    $result = @()
    $children = Get-CimInstance Win32_Process -Filter "ParentProcessId = $ParentId" -ErrorAction SilentlyContinue
    foreach ($child in $children) {
        $childPid = [int]$child.ProcessId
        $result += $childPid
        $result += Get-ChildProcessIdsRecursive -ParentId $childPid
    }
    return $result | Sort-Object -Unique
}

function Stop-ProcessTree {
    param(
        [Parameter(Mandatory = $true)]
        [int]$ProcessId
    )

    $allPids = @($ProcessId) + (Get-ChildProcessIdsRecursive -ParentId $ProcessId)
    $allPids = $allPids | Sort-Object -Unique -Descending

    foreach ($id in $allPids) {
        Stop-Process -Id $id -Force -ErrorAction SilentlyContinue
    }
}

function Get-ListeningProcessIds {
    param(
        [Parameter(Mandatory = $true)]
        [int]$Port
    )

    $pattern = ":{0}\s" -f $Port
    $lines = netstat -ano -p tcp | Where-Object { $_ -match 'LISTENING' -and $_ -match $pattern }
    $ids = @()

    foreach ($line in $lines) {
        $parts = ($line.ToString() -split '\s+') | Where-Object { $_ }
        if ($parts.Length -ge 5) {
            $parsedProcessId = 0
            if ([int]::TryParse($parts[4], [ref]$parsedProcessId)) {
                $ids += $parsedProcessId
            }
        }
    }

    return $ids | Sort-Object -Unique
}

function Assert-PortAvailable {
    param(
        [Parameter(Mandatory = $true)]
        [int]$Port
    )

    $pids = @(Get-ListeningProcessIds -Port $Port)
    if ($pids.Count -eq 0) {
        return
    }

    $details = @()
    foreach ($processId in $pids) {
        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
        if ($null -ne $process) {
            $details += "{0}({1})" -f $process.ProcessName, $process.Id
        } else {
            $details += "PID $processId"
        }
    }

    throw "Port $Port is already in use by: $($details -join ', ')"
}

function Test-HttpReady {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Url
    )

    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
        return $response.StatusCode -ge 200 -and $response.StatusCode -lt 500
    } catch {
        return $false
    }
}

function Wait-HttpReady {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Url,
        [int]$TimeoutSeconds = 90
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-HttpReady -Url $Url) {
            return $true
        }
        Start-Sleep -Seconds 2
    }
    return $false
}

function Ensure-FrontendDependencies {
    if ($SkipInstall) {
        return
    }

    $nodeModulesDir = Join-Path $FrontendDir 'node_modules'
    if (Test-Path -LiteralPath $nodeModulesDir) {
        return
    }

    Push-Location $FrontendDir
    try {
        Write-Host 'Installing frontend dependencies with bun...'
        & bun install
        if ($LASTEXITCODE -ne 0) {
            throw 'bun install failed'
        }
    } finally {
        Pop-Location
    }
}

function Ensure-FrontendBuild {
    $distDir = Join-Path $FrontendDir 'dist'
    if ($SkipFrontendBuild) {
        if (-not (Test-Path -LiteralPath $distDir)) {
            throw 'web/dist does not exist. Run without -SkipFrontendBuild first.'
        }
        return
    }

    $previousVersion = $null
    $hadVersion = Test-Path Env:VITE_REACT_APP_VERSION
    if ($hadVersion) {
        $previousVersion = $env:VITE_REACT_APP_VERSION
    }

    Push-Location $FrontendDir
    try {
        $env:VITE_REACT_APP_VERSION = Get-VersionValue
        Write-Host 'Building frontend bundle for backend embed...'
        & bun run build
        if ($LASTEXITCODE -ne 0) {
            throw 'bun run build failed'
        }
    } finally {
        if ($hadVersion) {
            $env:VITE_REACT_APP_VERSION = $previousVersion
        } else {
            Remove-Item Env:VITE_REACT_APP_VERSION -ErrorAction SilentlyContinue
        }
        Pop-Location
    }
}

function Stop-DevPreview {
    foreach ($pidFile in @($BackendPidFile, $FrontendPidFile)) {
        $processId = Get-PidFromFile -Path $pidFile
        if ($null -ne $processId) {
            Stop-ProcessTree -ProcessId $processId
        }
        Remove-PidFile -Path $pidFile
    }
}

function Start-DevPreview {
    New-Item -ItemType Directory -Force -Path $RuntimeDir | Out-Null

    Stop-DevPreview
    Assert-PortAvailable -Port $BackendPort
    Assert-PortAvailable -Port $FrontendPort

    Ensure-FrontendDependencies
    Ensure-FrontendBuild

    foreach ($path in @($BackendOutLog, $BackendErrLog, $FrontendOutLog, $FrontendErrLog)) {
        Clear-LogFile -Path $path
    }

    Write-Host 'Starting backend on http://127.0.0.1:3000 ...'
    $backendProcess = Start-Process -FilePath 'go' -ArgumentList @('run', 'main.go') -WorkingDirectory $RepoRoot -RedirectStandardOutput $BackendOutLog -RedirectStandardError $BackendErrLog -PassThru
    Set-PidFile -Path $BackendPidFile -ProcessId $backendProcess.Id

    Write-Host 'Starting frontend dev server on http://127.0.0.1:5173 ...'
    $frontendProcess = Start-Process -FilePath 'bun' -ArgumentList @('run', 'dev', '--host', '127.0.0.1', '--port', '5173') -WorkingDirectory $FrontendDir -RedirectStandardOutput $FrontendOutLog -RedirectStandardError $FrontendErrLog -PassThru
    Set-PidFile -Path $FrontendPidFile -ProcessId $frontendProcess.Id

    $backendReady = Wait-HttpReady -Url $BackendUrl -TimeoutSeconds 90
    $frontendReady = Wait-HttpReady -Url $FrontendUrl -TimeoutSeconds 30

    if (-not $backendReady) {
        throw "Backend did not become ready. Check $BackendOutLog and $BackendErrLog"
    }
    if (-not $frontendReady) {
        throw "Frontend dev server did not become ready. Check $FrontendOutLog and $FrontendErrLog"
    }

    Show-DevPreviewStatus
}

function Show-DevPreviewStatus {
    $backendPid = Get-PidFromFile -Path $BackendPidFile
    $frontendPid = Get-PidFromFile -Path $FrontendPidFile
    $backendReady = Test-HttpReady -Url $BackendUrl
    $frontendReady = Test-HttpReady -Url $FrontendUrl

    Write-Host ''
    Write-Host 'Dev preview status'
    Write-Host ('- Backend  : {0} ({1})' -f ($(if ($backendReady) { 'up' } else { 'down' }), $BackendUrl))
    Write-Host ('- Frontend : {0} ({1})' -f ($(if ($frontendReady) { 'up' } else { 'down' }), $FrontendUrl))
    Write-Host ('- Backend PID file : {0}' -f $(if ($backendPid) { $backendPid } else { 'missing' }))
    Write-Host ('- Frontend PID file: {0}' -f $(if ($frontendPid) { $frontendPid } else { 'missing' }))
    Write-Host ('- Logs: {0}' -f $RuntimeDir)
    Write-Host ''
}

Set-Location $RepoRoot

switch ($Action) {
    'start' {
        Start-DevPreview
    }
    'stop' {
        Stop-DevPreview
        Show-DevPreviewStatus
    }
    'restart' {
        Stop-DevPreview
        Start-DevPreview
    }
    'status' {
        Show-DevPreviewStatus
    }
}
