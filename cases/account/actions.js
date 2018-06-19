import {mapActions} from 'redux-async-actions-reducers';
import actionTypes from './action.types';
import {Request} from 'gm-util';

let actions = {};

actions.account_info = () => {
    return dispatch => {
        return Request('/user/subaccount').get().then(json => {
            dispatch({
                type: actionTypes.ACCOUNT_INFO,
                list: json.data
            });
        });
    };
};

actions.account_detail = (detail) => {
    return {
        type: actionTypes.ACCOUNT_DETAIL,
        detail
    };
};

actions.account_change = (value, name) => {
    return {
        type: actionTypes.ACCOUNT_CHANGE,
        value,
        name
    };
};

actions.account_save = (id, username, sub_permissions, addresses) => {
    return () => {
        return Request('/user/subaccount').data({
            sub_id: id,
            username,
            sub_permissions,
            addresses: JSON.stringify(addresses)
        }).post();
    };
};

actions.account_remove = (id) => {
    return () => {
        return Request('/user/subaccount').data({sub_id: id, 'delete': 1}).post();
    };
};

mapActions(actions);
