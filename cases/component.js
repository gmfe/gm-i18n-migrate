import React from 'react';
import {Page, Flex} from 'react-mgm';

class NotFound extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            time: 5,
            url: `/v587/${window.location.search}`
        };
        this.timer = null;
    }

    render() {
        return (
            <Page white>
                <div className="padding-12">
                    <Flex justifyCenter alignCenter className="text-center" style={{width: '150px', margin: '80px auto 0'}}>
                        <img className="img-responsive" src={this.props.global.getIn(['cms_config', 'logo'])}/>
                    </Flex>
                    <div className="padding-12">
                        <p className="text-warning text-14 text-center">抱歉，您访问的页面地址有误，或该页面不存在</p>
                        <p className="margin-top-4 text-14 text-center">请检查输入的网址或重新收藏页面</p>
                    </div>
                    <a href={this.state.url} className="weui-btn weui-btn_primary btn-default-size-130"
                       style={{marginTop: '30px'}}>点击跳转到首页</a>
                    <div className="text-desc text-12 text-center margin-top-4">{this.state.time}s后自动跳转</div>
                </div>
            </Page>
        );
    }

    countDown() {
        this.timer = setTimeout(() => {
            if (this.state.time <= 0) {
                window.location.href = this.state.url;
                return;
            }
            this.setState({
                time: this.state.time - 1
            });
            this.countDown();
        }, 1000);
    }

    componentDidMount() {
        this.countDown();
    }

    componentWillUnmount() {
        clearTimeout(this.timer);
    }
}

export default NotFound;