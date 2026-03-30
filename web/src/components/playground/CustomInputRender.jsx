/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React, { useRef, useEffect, useCallback } from 'react';
import { Button, Toast } from '@douyinfe/semi-ui';
import { ImagePlus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePlayground } from '../../contexts/PlaygroundContext';

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        resolve(result);
        return;
      }
      reject(new Error('invalid_image_data_url'));
    };
    reader.onerror = () => {
      reject(reader.error || new Error('image_read_failed'));
    };
    reader.readAsDataURL(file);
  });

const CustomInputRender = (props) => {
  const { t } = useTranslation();
  const {
    onPasteImage,
    onSelectImages,
    onRemoveImage,
    onClearImages,
    imageEnabled,
    imageUrls = [],
    maxImageCount = 4,
    maxImageSize = 3 * 1024 * 1024,
  } = usePlayground();
  const { detailProps } = props;
  const { clearContextNode, inputNode, sendNode, onClick } = detailProps;
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);

  const appendImages = useCallback(
    async (files) => {
      if (!imageEnabled) {
        Toast.warning({
          content: t('请先在设置中启用图片功能'),
          duration: 3,
        });
        return;
      }

      const remainingSlots = Math.max(maxImageCount - imageUrls.length, 0);
      if (remainingSlots <= 0) {
        Toast.warning({
          content: t('最多只能添加 {{count}} 张图片', { count: maxImageCount }),
          duration: 3,
        });
        return;
      }

      const imageFiles = (files || []).filter(
        (file) => file && file.type && file.type.startsWith('image/'),
      );

      if (imageFiles.length === 0) {
        return;
      }

      const acceptedFiles = [];
      let hasOversizedFile = false;

      for (const file of imageFiles.slice(0, remainingSlots)) {
        if (file.size > maxImageSize) {
          hasOversizedFile = true;
          continue;
        }
        acceptedFiles.push(file);
      }

      if (hasOversizedFile) {
        Toast.warning({
          content: t('图片大小不能超过 {{size}} MB', {
            size: Math.floor(maxImageSize / 1024 / 1024),
          }),
          duration: 3,
        });
      }

      if (acceptedFiles.length === 0) {
        return;
      }

      try {
        const dataUrls = await Promise.all(
          acceptedFiles.map((file) => readFileAsDataUrl(file)),
        );

        if (typeof onSelectImages === 'function') {
          onSelectImages(dataUrls);
        } else if (typeof onPasteImage === 'function') {
          dataUrls.forEach((imageUrl) => onPasteImage(imageUrl));
        } else {
          Toast.error({
            content: t('无法添加图片'),
            duration: 2,
          });
          return;
        }

        Toast.success({
          content: t('已添加 {{count}} 张图片', { count: dataUrls.length }),
          duration: 2,
        });
      } catch (error) {
        console.error('Failed to read image files:', error);
        Toast.error({
          content: t('图片读取失败'),
          duration: 2,
        });
      }
    },
    [
      imageEnabled,
      imageUrls.length,
      maxImageCount,
      maxImageSize,
      onPasteImage,
      onSelectImages,
      t,
    ],
  );

  const handlePaste = useCallback(
    async (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = item.getAsFile();

          if (file) {
            await appendImages([file]);
          }
          break;
        }
      }
    },
    [appendImages],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('paste', handlePaste);
    return () => {
      container.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);

  // 清空按钮
  const styledClearNode = clearContextNode
    ? React.cloneElement(clearContextNode, {
        className: `!rounded-full !bg-gray-100 hover:!bg-red-500 hover:!text-white flex-shrink-0 transition-all ${clearContextNode.props.className || ''}`,
        style: {
          ...clearContextNode.props.style,
          width: '32px',
          height: '32px',
          minWidth: '32px',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
      })
    : null;

  // 发送按钮
  const styledSendNode = React.cloneElement(sendNode, {
    className: `!rounded-full !bg-purple-500 hover:!bg-purple-600 flex-shrink-0 transition-all ${sendNode.props.className || ''}`,
    style: {
      ...sendNode.props.style,
      width: '32px',
      height: '32px',
      minWidth: '32px',
      padding: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

  const handleUploadClick = useCallback(
    (event) => {
      event.stopPropagation();
      if (!imageEnabled) {
        Toast.warning({
          content: t('请先在设置中启用图片功能'),
          duration: 3,
        });
        return;
      }
      fileInputRef.current?.click();
    },
    [imageEnabled, t],
  );

  const handleFileInputChange = useCallback(
    async (event) => {
      const files = Array.from(event.target.files || []);
      if (files.length > 0) {
        await appendImages(files);
      }
      event.target.value = '';
    },
    [appendImages],
  );

  return (
    <div className='p-2 sm:p-4' ref={containerRef}>
      <input
        ref={fileInputRef}
        type='file'
        accept='image/*'
        multiple
        className='hidden'
        onChange={handleFileInputChange}
      />
      {imageUrls.length > 0 && (
        <div className='mb-3 rounded-2xl border border-slate-200 bg-white/80 px-3 py-3 shadow-sm'>
          <div className='mb-2 flex items-center justify-between gap-2'>
            <span className='text-xs font-medium text-slate-500'>
              {t('已添加 {{count}} 张图片', { count: imageUrls.length })}
            </span>
            {typeof onClearImages === 'function' && (
              <button
                type='button'
                className='text-xs text-slate-400 transition-colors hover:text-red-500'
                onClick={(event) => {
                  event.stopPropagation();
                  onClearImages();
                }}
              >
                {t('清空')}
              </button>
            )}
          </div>
          <div className='flex gap-2 overflow-x-auto pb-1'>
            {imageUrls.map((imageUrl, index) => (
              <div
                key={`${index}-${imageUrl.slice(0, 24)}`}
                className='relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50'
              >
                <img
                  src={imageUrl}
                  alt={t('待发送图片 {{index}}', { index: index + 1 })}
                  className='h-full w-full object-cover'
                />
                {typeof onRemoveImage === 'function' && (
                  <button
                    type='button'
                    className='absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80'
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemoveImage(index);
                    }}
                    aria-label={t('移除图片')}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <div
        className='flex items-center gap-2 sm:gap-3 p-2 bg-gray-50 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-md transition-shadow'
        style={{ border: '1px solid var(--semi-color-border)' }}
        onClick={onClick}
        title={t('支持 Ctrl+V 粘贴图片')}
      >
        {/* 清空对话按钮 - 左边 */}
        {styledClearNode}
        <Button
          theme='borderless'
          type='tertiary'
          icon={<ImagePlus size={16} />}
          className='!rounded-full !bg-white hover:!bg-sky-50 !text-slate-500 hover:!text-sky-600 flex-shrink-0'
          style={{
            width: '32px',
            height: '32px',
            minWidth: '32px',
            padding: 0,
          }}
          onClick={handleUploadClick}
          aria-label={t('上传图片')}
        />
        <div className='flex-1'>{inputNode}</div>
        {/* 发送按钮 - 右边 */}
        {styledSendNode}
      </div>
    </div>
  );
};

export default CustomInputRender;
