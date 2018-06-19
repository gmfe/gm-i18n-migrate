import React from 'react';
import { Page, Flex } from 'react-mgm';
import _ from 'lodash';
import { permissions } from '../common/filter';
import { history } from '../common/service';
import actions from '../actions';
import Navigator from '../header/navigator';

import './actions';
import './reducer';

class Account extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            error: ''
        };
    }

    componentDidMount() {
        actions.account_info();
    }

    handleDetail(value, event) {
        event.preventDefault();
        if (value) {
            history.push({
                pathname: '/my/account/' + value.id,
                query: { detail: JSON.stringify(value) }
            });
        } else {
            history.push('/my/account/edit');
        }
    }

    render() {
        const account = this.props.account;
        return (
            <Page
                header={<Navigator title="子账号" />}
                className="b-my-account"
            >
                {account.list.length === 0 ? (
                    <Flex column justifyCenter alignCenter
                        style={{ paddingTop: '20px', paddingBottom: '20px', background: 'white' }}>
                        <Flex justifyCenter alignCenter className='b-nothing-bg'>
                            <div className='b-nothing' />
                        </Flex>
                        <div className="text-disabled text-12 margin-top-4">
                            当前无可管理子账号
                        </div>
                        <div className="padding-4">
                            <button className="weui-btn weui-btn_primary btn-default-size-130"
                                onClick={this.handleDetail.bind(this, null)}>创建子账号
                            </button>
                        </div>
                    </Flex>
                ) : (
                        <div>
                            {_.map(account.list, (value, index) => (
                                <div key={index} className='weui-form-preview'>
                                    <div className="weui-form-preview__bd text-12 bg-white"
                                        onClick={this.handleDetail.bind(this, value)}>
                                        <div className="weui-form-preview__item">
                                            <label className="weui-form-preview__label text-desc">子账号</label>
                                            <span className="weui-form-preview__value text">{value.username}</span>
                                        </div>
                                        <div className="weui-form-preview__item">
                                            <label className="weui-form-preview__label text-desc">子账号权限</label>
                                            <span
                                                className="weui-form-preview__value text">{permissions(value.sub_permissions)}</span>
                                        </div>
                                        <div className="weui-form-preview__item">
                                            <label className="weui-form-preview__label text-desc">管理商户</label>
                                            <span className="weui-form-preview__value text">
                                                {
                                                    _.map(value.addresses, (v, i) => (
                                                        <div key={i}>
                                                            {v.resname}
                                                        </div>
                                                    ))
                                                }
                                            </span>
                                        </div>
                                        <i className='ifont ifont-angle-right'></i>
                                    </div>
                                </div>
                            ))}
                            <div style={{ marginTop: '40px' }}>
                                <button className="weui-btn weui-btn_primary btn-default-size-130"
                                    onClick={this.handleDetail.bind(this, null)}>创建子账号
                            </button>
                            </div>
                        </div>
                    )}
            </Page>
        );
    }
}

export default Account;