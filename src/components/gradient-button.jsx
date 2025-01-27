import React from 'react';
import { AntDesignOutlined } from '@ant-design/icons';
import { Button, ConfigProvider, Space } from 'antd';
import { createStyles } from 'antd-style';
import "./style.scss";
import { BiSolidSave } from "react-icons/bi";

const useStyle = createStyles(({ prefixCls, css }) => ({
  linearGradientButton: css`
    &.${prefixCls}-btn-primary:not([disabled]):not(.${prefixCls}-btn-dangerous) {
      > span {
        position: relative;
      }

      &::before {
        content: '';
        background: linear-gradient(135deg, #0D3A71, #4A90E2);
        position: absolute;
        inset: -1px;
        opacity: 1;
        transition: all 0.3s;
        border-radius: inherit;
      }

      &:hover::before {
        opacity: 0.3;
      }
    }
  `,
}));
const AppButton = ({disabled, title, onClick}) => {
  const { styles } = useStyle();
  return (
    <ConfigProvider
      button={{
        className: styles.linearGradientButton,
      }}
    >
      <Space>
        <Button type="primary" size="large"  icon={<BiSolidSave />} disabled={disabled} onClick={onClick}>
          {title}
        </Button>
        {/* <Button size="large">Button</Button> */}
      </Space>
    </ConfigProvider>
  );
};
export default AppButton;