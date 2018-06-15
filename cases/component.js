
import React from 'react';
import {Page, Flex} from 'react-mgm';

class NotFound extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            time: 5,
            url: `/notfound`,
            name:'孙子涵'
        };
        this.timer = null;
    }

    render() {
        return (
            <Page white>
                <div className="padding-12">
                    <ul>
                        <li class={this.state.name==='孙子涵'?'a':'b'}>点击跳转到首页</li>
                        <li>{this.state.time}s后自动跳转{this.state.url}</li>
                    </ul>

                </div>
            </Page>
        );
    }

}

export default NotFound;
