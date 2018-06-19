import actionTypes from '../action.types';
import {keyMirror} from 'gm-util';

export default Object.assign(actionTypes, keyMirror({
    ACCOUNT_INFO: null,
    ACCOUNT_ADDRESS: null,
    ACCOUNT_DETAIL: null,
    ACCOUNT_CHANGE: null
}));