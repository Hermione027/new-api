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

import React, { useMemo } from 'react';
import { Modal, TextArea, Typography } from '@douyinfe/semi-ui';
import { useTranslation } from 'react-i18next';

const MessageEditDialog = ({
  visible,
  message,
  editValue,
  onEditValueChange,
  onSave,
  onCancel,
  isMobile = false,
}) => {
  const { t } = useTranslation();

  const hasImages = useMemo(() => {
    if (!Array.isArray(message?.content)) {
      return false;
    }

    return message.content.some((item) => item?.type === 'image_url');
  }, [message]);

  const dialogTitle = useMemo(() => {
    if (message?.role === 'assistant') {
      return t('编辑助手消息');
    }
    if (message?.role === 'system') {
      return t('编辑系统消息');
    }
    return t('编辑用户消息');
  }, [message?.role, t]);

  return (
    <Modal
      title={dialogTitle}
      visible={visible}
      onOk={onSave}
      onCancel={onCancel}
      okText={t('保存')}
      cancelText={t('取消')}
      okButtonProps={{
        disabled: !editValue || editValue.trim() === '',
      }}
      width={isMobile ? 'calc(100vw - 24px)' : 820}
      centered
      closeOnEsc
      bodyStyle={{
        paddingTop: 12,
      }}
    >
      <div className='space-y-3'>
        {hasImages && (
          <div className='rounded-xl border border-sky-100 bg-sky-50 px-3 py-2'>
            <Typography.Text className='text-sm text-sky-700'>
              {t('这条消息里的图片会保留，本次只编辑文字内容。')}
            </Typography.Text>
          </div>
        )}

        <TextArea
          value={editValue}
          onChange={onEditValueChange}
          placeholder={t('请输入消息内容...')}
          autosize={false}
          rows={isMobile ? 12 : 18}
          autoFocus
          style={{
            width: '100%',
            resize: 'vertical',
            fontSize: isMobile ? '14px' : '15px',
            lineHeight: '1.7',
          }}
        />
      </div>
    </Modal>
  );
};

export default MessageEditDialog;
