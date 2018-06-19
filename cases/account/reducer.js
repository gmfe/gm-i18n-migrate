import {mapReducers} from 'redux-async-actions-reducers';
import actionTypes from './action.types';
import _ from 'lodash';

const initState = {
    list: [],
    detail: {
        addresses: []
    },
    addresses: []
};

let reducers = {};
reducers.account = (state = initState, action) => {
    switch (action.type) {
        case actionTypes.ACCOUNT_INFO:
            return Object.assign({}, state, {list: action.list});

        case actionTypes.ACCOUNT_DETAIL: {
            const detail = action.detail;
            detail.addresses = _.map(detail.addresses, value => value.id);
            return Object.assign({}, state, {detail});
        }

        case actionTypes.ACCOUNT_CHANGE: {
            let newState = Object.assign({}, state);
            const {name, value} = action;
            // 特殊，支持 1 5 切换
            if (name === 'sub_permissions' && value === 5 && state.detail.sub_permissions === 5) {
                newState.detail[action.name] = 1;
            } else {
                newState.detail[action.name] = action.value;
            }
            return Object.assign({}, newState);
        }

        case actionTypes.ACCOUNT_ADDRESS:
            return Object.assign({}, state, {addresses: action.addresses});

        default:
            return state;
    }
};

mapReducers(reducers);