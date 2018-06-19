import React from 'react';
import { Page, Dialog, Cells, Cell, CellBody, CellHeader, Flex } from 'react-mgm';
import _ from 'lodash';
import { isOnlyOfflinePay, isMobile } from '../common/util';
import { history } from '../common/service';
import Navigator from '../header/navigator';
import actions from '../actions';
import './actions';
import './reducer';

class Account extends React.Component {
    constructor(props) {
        super(props);

        this.handleChange = :: this.handleChange;
        this.handleSave = :: this.handleSave;
        this.handleRemove = :: this.handleRemove;
        this.handleConfirm = :: this.handleConfirm;
        this.handleCancel = :: this.handleCancel;
        this.handleBack = :: this.handleBack;

        this.state = {
            error: '',
            dialog: false
        };
    }

    handleChange(event) {
        let value = event.target.value,
            name = event.target.name;

        if (name === 'sub_permissions') {
            value = parseInt(value, 10);
        }
        if (name === 'addresses') {
            let addresses = this.props.account.detail.addresses;
            addresses = _.filter(addresses, val => val !== ~~value);
            if (event.target.checked) {
                addresses.push(~~value);
            }
            value = addresses;
        }
        actions.account_change(value, name);
    }

    componentDidMount() {
        const id = this.props.params.id;
        let detail = {
            addresses: []
        };
        if (id !== 'edit') {
            detail = JSON.parse(this.props.location.query.detail);
        }

        actions.account_detail(detail);
        actions.global_get_user_account();
    }

    handleSave() {
        const detail = this.props.account.detail;
        if (!isMobile(detail.username)) {
            this.setState({
                error: '请填写正确的手机号'
            });
            return;
        }
        if (!detail.sub_permissions) {
            this.setState({
                error: '请至少选中一个权限'
            });
            return;
        }
        if (detail.addresses.length === 0) {
            this.setState({
                error: '请至少选中一个管理商户'
            });
            return;
        }

        const id = this.props.params.id;

        actions.account_save(id === 'edit' ? null : id, detail.username, detail.sub_permissions, detail.addresses).then(() => {
            history.go(-1);
        });
    }

    handleCancel() {
        this.setState({
            dialog: false
        });
    }

    handleConfirm() {
        const id = this.props.params.id;
        actions.account_remove(id).then(() => {
            history.go(-1);
        });
    }

    handleRemove() {
        this.setState({
            dialog: true
        });
    }

    handleBack() {
        history.go(-1);
    }

    render() {
        const { detail } = this.props.account;
        const userAccount = this.props.global.get('userAccount').toJS(),
            pay_type = this.props.global.getIn(['cms_config', 'pay_type']);

        return (
            <Page
                header={<Navigator title={this.props.params.id !== 'edit' ? "编辑子账号" : "创建子账号"} />}
                className="b-my-account-edit"
            >
                <div className='b-my-account-edit-title text-12 text-desc bg-title text-line'>子账号信息</div>
                <Cells className="weui-cells_checkbox">
                    <Cell>
                        <CellHeader>账号名</CellHeader>
                        <CellBody>
                            <input
                                type='number' value={detail.username || ''}
                                className="weui-input"
                                name="username"
                                disabled={detail.id}
                                onChange={this.handleChange}
                                placeholder="输入手机号"
                            />
                        </CellBody>
                    </Cell>
                    <Cell className='b-sub-account'>
                        <CellHeader>子账号权限</CellHeader>
                        <CellBody>
                            <label className="weui-cell weui-check__label">
                                <input
                                    type="checkbox"
                                    name="sub_permissions"
                                    className="weui-check"
                                    value={5}
                                    checked={detail.sub_permissions === 1 || detail.sub_permissions === 5}
                                    onChange={this.handleChange}
                                />
                                <i className="weui-icon-checked" />
                                &nbsp;下单
                            </label>
                            <label className="weui-cell weui-check__label b-my-account-edit-price">
                                <input
                                    type="checkbox"
                                    name="sub_permissions"
                                    className="weui-check"
                                    value={5}
                                    checked={detail.sub_permissions === 5}
                                    onChange={this.handleChange}
                                />
                                <i className="weui-icon-checked" />
                                &nbsp;可见商品价格
                            </label>
                            {
                                isOnlyOfflinePay(pay_type) ?
                                    null :
                                    <label className="weui-cell weui-check__label">
                                        <input
                                            type="checkbox"
                                            name="sub_permissions"
                                            className="weui-check"
                                            value={7}
                                            checked={detail.sub_permissions === 7}
                                            onChange={this.handleChange}
                                        />
                                        <i className="weui-icon-checked" />
                                        &nbsp;下单和结算
                                    </label>
                            }
                        </CellBody>
                    </Cell>
                    <Cell className='b-manege-account'>
                        <CellHeader>可管理商户</CellHeader>
                        <CellBody>
                            {_.map(userAccount.addresses, (value, index) => (
                                <label key={index} className="weui-cell weui-check__label">
                                    <input type="checkbox" className="weui-check"
                                        checked={detail.addresses.indexOf(value.id) > -1}
                                        name="addresses"
                                        value={value.id}
                                        onChange={this.handleChange}
                                    />
                                    <i className="weui-icon-checked" />
                                    &nbsp;{value.resname}
                                </label>
                            ))}
                        </CellBody>
                    </Cell>
                </Cells>
                <div className="padding-top-8 padding-left-16 text-12 text-desc">
                    登录密码默认为账号后六位，子账号登录后可修改密码
                </div>

                <div className="padding-top-0 padding-left-16 text-warning text-small"
                    style={{ height: '40px' }}>{this.state.error}</div>

                {this.props.params.id === 'edit' && (
                    <Flex alignCenter justifyCenter className="padding-12 padding-top-0">
                        <button className="weui-btn weui-btn_default btn-default-size-130" style={{ marginRight: '8px' }}
                            onClick={this.handleBack}>取消
                        </button>
                        <button className="weui-btn weui-btn_primary btn-default-size-130 margin-top-0"
                            style={{ marginLeft: '8px' }} onClick={this.handleSave}>确认创建
                        </button>
                    </Flex>
                )}
                {this.props.params.id !== 'edit' && (
                    <Flex alignCenter justifyCenter className="padding-12 padding-top-0">
                        <button className="weui-btn weui-btn_default btn-default-size-130" style={{ marginRight: '8px' }}
                            onClick={this.handleRemove}>删除子账号
                        </button>
                        <button className="weui-btn weui-btn_primary btn-default-size-130 margin-top-0"
                            style={{ marginLeft: '8px' }} onClick={this.handleSave}>保存修改
                        </button>
                    </Flex>
                )}
                <Dialog show={this.state.dialog} confirm title="提示" onConfirm={this.handleConfirm}
                    onCancel={this.handleCancel}>是否删除此子账号？</Dialog>
            </Page>
        );
    }
}

export default Account;