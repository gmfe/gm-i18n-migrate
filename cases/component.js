import React from 'react';
import PropTypes from 'prop-types';
import {
	Flex,
	Progress,
	QuickTab,
	FilterSearchSelect,
	Tip,
    Loading
} from 'react-gm';
import OrderTab from './goodDetailTabs/orderTab';
import PurchaseTab from './goodDetailTabs/purchaseTab';
import ReferenceTab from './goodDetailTabs/referenceTab';
import styles from '../style.less';
import moment from 'moment';
import Big from 'big.js';
import actions from '../../../actions';
import {connect} from 'react-redux';
import _ from 'lodash';
import {pinYinFilter} from 'gm-util';

class PopupGoodDetail extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			tabKey: 0
		};
		this.handleSelectTab = :: this.handleSelectTab;
		this.handleTaskSupplierEdit = :: this.handleTaskSupplierEdit;
		this.handleTaskSupplierUpdate = :: this.handleTaskSupplierUpdate;
		this.handlePurchaseListSearchItem = :: this.handlePurchaseListSearchItem;
	}

	async componentDidMount () {
		const {spec_id, release_id} = this.props.taskIds;
		
		await actions.purchase_task_list_search_item_clear();
		// 获取到当前点击的采购条
		this.props.global.user.permission.includes("get_purchase_task_item") ? 
			this.handlePurchaseListSearchItem() : null;
		// 获取采购记录的历史
		this.props.global.user.permission.includes("get_purchase_history") ? 
			actions.purchase_history_get(spec_id, release_id || 0) : null;
		// 获取近七天的询价信息
		this.props.global.user.permission.includes("get_purchase_market") ? 
			actions.purchase_market_information(spec_id) : null;
	}
	

	handleSelectTab(tabKey) {
		this.setState({tabKey});
	}

	handlePurchaseListSearchItem() {
		const {taskIds, getSearchOption} = this.props;
		let query = {
			...getSearchOption(),
			...taskIds
		};
		actions.purchase_task_list_search_item(query);
	}

	/* 
		taskIndex 当前的商品的序号
		orderIndex 当前的商品关联订单的序号
		ifOrderUpdate 是否为商品的关联订单每一项的供应商更新 默认为false
		ifAllUpdate 是否商品的总供应商更新
	*/
	async handleTaskSupplierUpdate(task, orderIndex, ifOrderUpdate=false) {
		const {tasks} = task,
            taskItem = orderIndex === null ? task : task.tasks[orderIndex],
            {_supplier_edit_selected} = taskItem;

        if (!_supplier_edit_selected) {
            Tip.warning('请选择供应商');
            return false;
        } else if (_supplier_edit_selected.id === task.settle_supplier_id) {
            // 没有变化，则不发请求
            this.handleTaskSupplierEdit(taskItem, orderIndex);
            return;
		} 
		
        let ids = [];
        if (orderIndex === null) {
            ids = _.map(tasks, t => t.id);
        } else {
            ids = [taskItem.id];
		}

        await actions.purchase_item_supplier_update(ids, _supplier_edit_selected.id).then(() => {
            actions.purchase_task_order_supplier_update(taskItem, _supplier_edit_selected);
		});
		
		this.props.handleListSearchPage(); // 刷新tasklist页面
		this.handlePurchaseListSearchItem();

		// 关闭右侧弹窗：商品总供应商修改、商品只剩下一条订单供应商修改 handleChangeModalHide 注意：orderIndex如果不存在说明是在总供应商修改
		if (!_.isNil(orderIndex) && ifOrderUpdate && tasks && tasks.length !== 1) {
			return false;
		}
		this.props.handleChangeModalHide();
	}
	
	handleTaskSupplierEdit(purchaseTask, task, orderIndex) {
        const {taskSupplierMap} = purchaseTask,
            taskItem = orderIndex === null ? task : task.tasks[orderIndex],
            {_supplier_edit} = task;

        // 拉取可修改的供应商
        if (!_supplier_edit && !_.has(taskSupplierMap, task.spec_id)) {
            actions.purchase_task_supplier_can_change_get(task.spec_id);
        }
		actions.purchase_task_order_supplier_edit_toggle(taskItem);
	}
	
	handlInputFilter(list, query) {
        return pinYinFilter(list, query, supplier => supplier.name);
	}
	
	handleTaskOrderSupplierChange(task, orderIndex, supplier) {
        actions.purchase_task_order_supplier_change(task, orderIndex, supplier);
	}
	
	getStatusNameColor (status, type) {
		let statusName, statusClass;
		switch (status) {
			case 1:
				statusName = "未发";
				statusClass = "purchaseStatusBgUnpublished";
				break;
			case 2:
				statusName = "已发";
				statusClass = "purchaseStatusBgRelease";
				break;
			case 3:
				statusName = "完成";
				statusClass = "purchaseStatusBgDone";
				break; 
			default:
				break;
		}
		if (type === 1) {
			return statusClass;
		} else if (type === 2) {
			return statusName;
		}
	}

	renderSupplierName(task, purchaseTask) {
		const {taskSupplierMap} = purchaseTask;
		const {_supplier_edit, _supplier_edit_selected, editable, settle_supplier_name} = task;
		if (_supplier_edit) {
			return (
				<div className={styles.taskOrderFilterWrap}>
					<FilterSearchSelect
						key={'purchase_list_' + task}
						list={taskSupplierMap[task.spec_id] || []}
						selected={_supplier_edit_selected}
						onSelect={this.handleTaskOrderSupplierChange.bind(this, task, null)}
						onFilter={this.handlInputFilter}
						placeholder={"全部供应商"}
					/>
					<a className="glyphicon glyphicon-ok gm-margin-left-5"
						onClick={this.handleTaskSupplierUpdate.bind(this, task, null, false)}/>
					<a className="glyphicon glyphicon-remove gm-margin-left-5"
						onClick={this.handleTaskSupplierEdit.bind(this, purchaseTask, task, null)}/>
				</div>
			);
		}

		const isEditable = task.status === 1;

		if (!isEditable || !editable)
			return settle_supplier_name;

		return (
			<div className={styles.taskOrderFilterWrap}
				onClick={this.handleTaskSupplierEdit.bind(this, purchaseTask, task, null)}>
				<span>{settle_supplier_name || '全部供应商'}</span>
				<a className="glyphicon glyphicon-pencil gm-margin-left-5"/>
			</div>
		);

	}

	render() {
		const {purchase_task, global, referencePriceFlag, handleReleaseTask, handleChangeModalHide, handleListSearchPage, progressUnit} = this.props,
			{purchaseHistory, purchaseMarketInfo, taskListItem} = purchase_task,
			task = taskListItem && taskListItem[0];
		const can_get_purchase_history = this.props.global.user.permission.includes("get_purchase_history"),  // 关联采购采购单据
			can_get_purchase_task_item = this.props.global.user.permission.includes("get_purchase_task_item"), // 关联订单权限
			can_get_purchase_market = this.props.global.user.permission.includes("get_purchase_market");  // 关联订单权限

		// 如果task 不存在 返回加载loading
		if (!task) {
			return (
				<Loading 
					style={{'marginTop': '50px'}}
					text="长时间未加载数据，请刷新页面"
				/>
			);
		}

		const {name, already_purchase_amount, plan_purchase_amount, std_unit_name, purchaser_name, release_time, sale_unit_name, sale_ratio, status, suggest_purchase_num, stock} = task,
			reference_price = task[referencePriceFlag], quickTabs = [];
		let suggestPurchaseNum = suggest_purchase_num > 0 ? `${Big(suggest_purchase_num).toFixed(2)}${task.std_unit_name}` : '库存充足',
			percentage = Number(Big(already_purchase_amount).div(plan_purchase_amount).times(100));
		
		// 根据权限 筛选出tab对应的内容
		if (can_get_purchase_task_item) {
			quickTabs.push(
				<OrderTab 
					key={quickTabs.length}
					global={global}
					purchaseTask = {purchase_task}
					task={task}
					handleReleaseTask={handleReleaseTask}
					handleChangeModalHide={handleChangeModalHide}
					handleTaskSupplierEdit={this.handleTaskSupplierEdit}
					handleTaskSupplierUpdate={this.handleTaskSupplierUpdate}
					handlInputFilter={this.handlInputFilter}
					handleTaskOrderSupplierChange={this.handleTaskOrderSupplierChange}
					handleListSearchPage={handleListSearchPage}
					handlePurchaseListSearchItem={this.handlePurchaseListSearchItem}
				/>
			);
		}
		if (can_get_purchase_history) {
			quickTabs.push(<PurchaseTab key={quickTabs.length} purchaseHistory={purchaseHistory} />);
		}
		if (can_get_purchase_market) {
			quickTabs.push(<ReferenceTab key={quickTabs.length} purchaseMarketInfo={purchaseMarketInfo} />);
		}
		return (
			<Flex column> 
				<Flex column className="gm-padding-tb-10 gm-padding-lr-20 gm-back-bg">
					<Flex>
						<div className={`${styles[this.getStatusNameColor(status, 1)]} ${styles.purchaseStatusName}`}>
							{this.getStatusNameColor(status, 2)}
						</div>
						<strong className="gm-margin-lr-10">{name}({sale_ratio}{std_unit_name}/{sale_unit_name})</strong>
						<div style={{width: '250px'}} className="gm-position-relative">
							<Progress 
								percentage={percentage <= 100 ? percentage : 100}
								strokeWidth={14}
								textInside  
								style={{paddingRight: '110px'}}
							/>
							<div className="gm-position-absolute gm-font-12" style={{left: '100px', top: '3px'}}>
								{progressUnit === '基本单位' ?
									`${Big(already_purchase_amount).valueOf(2)}${std_unit_name}
									/${Big(plan_purchase_amount).valueOf(2)}${std_unit_name}` 
									:
									`${Big(already_purchase_amount).div(sale_ratio).valueOf(2)}${sale_unit_name}/
									${Big(plan_purchase_amount).div(sale_ratio).valueOf(2)}${sale_unit_name}`
								}
							</div> 
						</div>
						

					</Flex>
					<Flex row className="gm-padding-top-15 gm-font-12">
						<Flex className="gm-padding-right-15">
							供应商：{this.renderSupplierName(task, purchase_task)}
						</Flex>
						<div className="gm-margin-right-15">
							参考价：{reference_price ? `${Big(reference_price || 0).div(100).toFixed(2)}元/${std_unit_name}` : '-'}
						</div>
						<div className="gm-margin-right-15">
							采购员：{purchaser_name}
						</div>
						<div className="gm-margin-right-15">
							建议采购：
							{stock < 0 ? 
								suggestPurchaseNum = `${Big(task.plan_purchase_amount).toFixed(2)}${task.std_unit_name}`
								: suggestPurchaseNum
							} 
						</div>
						<div>{release_time ? `发布：${moment(release_time).format('YYYY-MM-DD HH:mm:ss')}` : ''}</div>
					</Flex>
				</Flex>
				<Flex className="gm-padding-tb-15 gm-padding-lr-20">
					<QuickTab
						active={this.state.tabKey}
						tabs={_.filter([
								can_get_purchase_task_item ? `关联订单(${task.tasks.length})` : null, 
								can_get_purchase_history ? `关联采购单据(${purchaseHistory.length})` : null, 
								can_get_purchase_market ? '参考信息' : null
							], item => item)}
						onChange={this.handleSelectTab}
						style={{width: '860px'}}
					> 	
						{quickTabs} 
					</QuickTab>		
				</Flex>
				
			</Flex>
		);
	}
}

PopupGoodDetail.propTypes = {
	taskIndex: PropTypes.number.isRequired
};

PopupGoodDetail.defaultProps = {
	taskIndex: 0
};


export default connect(state => ({
	purchase_task: state.purchase_task,
	global: state.global
}))(PopupGoodDetail);
