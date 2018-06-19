
let f = a['kk']

let a = {tt:['中',{d:'国',f:'qwe'}]}
let post = {
    tags:[
        {
            name:'javascript',
        }
    ]
}

// var c = cb({a:'测试'},'北极光','qwer')

function t1(){
    let str1 = 'jack' + post.tags[0].name;
    let str2 = `jack${post.tags[0].name}`;
    let msg = `你好${name}，我是${name}`
    console.log(msg)
}


function t2(){
    let n = 1;
    let week = '日';
    let msg = '下单时间：周('+n+')' + week;
    console.log(msg)
}
