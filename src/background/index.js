/*global chrome*/
import { apiRequest } from '@/api'

let urlIndex = 0
let urlList = []
const OpenNums = 3

// 侦听从⻚⾯发来的消息和数据
chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        console.log(sender.tab ? "from a content script:" + sender.tab.url : "from the extension");
        // 点击【开始抓取】的时候，App.js传来的总的要抓取的⻚⾯列表，并将相关数据进⾏重置
        // 这一部分只会执行一次(在点击爬取按钮之后)
        if (request.type === "startScan") {
            urlList = request.data
            console.log(urlList);
            openTabs()
            return true;
        } else if (request.type === "parseLabels") {
            // console.log("本次上传的数据列表:", request.data, "数据信息:", request.dataInfo, request.content);
            console.log("最终上传的数据:", request.content);
            sendResponse({ data: request.data })
            closeTabs(request.dataInfo.url)
            return true;
        }
    }
);

// let timer = null
function openTabs() {
    // 只打开一轮 一轮之打开5次
    function openOneRound() {
        // if (urlIndex < urlList.length) {
        //     // 每次循环打开5次
        //     for (let i = 0; i < 5; i++) {
        //         // 需要检查这5次中是否存在没有的情况
        //         if (urlList[urlIndex]) {
        //             let openUrl = urlList[urlIndex].url
        //             console.log("打开URL:", openUrl);
        //             chrome.tabs.create({ url: openUrl })
        //             urlIndex++;
        //             // openTabs()
        //         }
        //     }
        // } else {
        //     urlIndex = 0
        // }

        // 每次循环打开5次
        for (let i = 0; i < OpenNums; i++) {
            // 需要检查这几次中是否存在没有的情况
            if (urlList[urlIndex]) {
                let openUrl = urlList[urlIndex].url
                console.log("打开URL:", openUrl);
                chrome.tabs.create({ url: openUrl })
                urlIndex++;
                // openTabs()
            } else {
                urlIndex = 0
                console.log("1 所有的url被打开完毕 需要结束");
            }
        }
    }

    openOneRound()

    // clearTimeout(timer)
    // timer = setTimeout(function () {
    //    openOneRound()
    // }, [720000])
}

let closeTimes = 0
function closeTabs(url) { // 3秒左右关闭
    const time = 4000 + Math.round(Math.random() * 3000)
    setTimeout(function () {
        chrome.tabs.query({ url: url }, function (tabs) {
            // chrome.tabs.remove(tabs[0].id, function () { });
        })
    }, time)
    closeTimes++
    console.log("tab关闭此次数:", closeTimes, "此时打开url的索引", urlIndex, "总的url数量", urlList.length);


    // 实现的主要思想: 每次打开固定n个tab 如果同样执行的了关闭n个tab 就再执行一轮openTabs()
    // 基本上实现了没什么问题 但是总觉得不太靠谱
    // 比如中间一旦有一次获取有问题 那么后面也会收到影响
    if (closeTimes && (closeTimes % OpenNums === 0) && urlIndex < urlList.length) {
        openTabs()
    }
}


// 问题1: 数据获取不准确(估计是时间戳获取的时候对比有问题)
// 问题2: 队列问题




// manifest.json的Permissions配置需添加 declarativeContent 权限
chrome.runtime.onInstalled.addListener(function () {
    // 默认先禁止Page Action。如果不加这一句，则无法生效下面的规则
    chrome.action.disable()
    chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
        // 设置规则
        let rule = {
            // 运行插件运行的页面URL规则
            conditions: [
                new chrome.declarativeContent.PageStateMatcher({
                    pageUrl: {
                        // 适配所有域名以“www.”开头的网页
                        // hostPrefix: 'www.'
                        // 适配所有域名以“.baidu.com”结尾的网页
                        // hostSuffix: '.baidu.com',
                        // 适配域名为“www.baidu.com”的网页
                        // hostEquals: 'www.baidu.com',
                        // 适配https协议的网页
                        schemes: ['https'],
                    },
                }),
            ],
            actions: [
                // ShowPageAction已被废弃，改用ShowAction。为了兼顾旧版，做了兼容适配
                chrome.declarativeContent.ShowAction
                    ? new chrome.declarativeContent.ShowAction()
                    : new chrome.declarativeContent.ShowPageAction(),
            ],
        }
        // 整合所有规则
        const rules = [rule]
        // 执行规则
        chrome.declarativeContent.onPageChanged.addRules(rules)
    })
})

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    // 接受来自content-script的消息，requset里不允许传递function和file类型的参数
    chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
        const { contentRequest } = request
        // 接收来自content的api请求
        if (contentRequest === 'apiRequest') {
            let { config } = request
            // API请求成功的回调
            config.success = (data) => {
                data.result = 'succ'
                sendResponse(data)
            }
            // API请求失败的回调
            config.fail = (msg) => {
                sendResponse({
                    result: 'fail',
                    msg
                })
            }
            // 发起请求
            apiRequest(config)
        }
    })
    return true
})