/*global chrome*/
import React, { useState } from 'react'
import { createRoot } from "react-dom/client"
import PopModal from './components/PopModal'
import './antd-diy.css'
import './content.scss'
import jsonData from "@/common/urlList.json"
import { uploadFile } from "@/common/uploadData"
import { switchTime, formatTime } from "@/common/utils"

const urlList = jsonData.urlLists
let flag = false // 用于判断是否要获取本页面
let dataInfo = {}
let displayData = []
let resultData = [] // 最终的数据
let timer = null

// const STOPTIMESTAMP = new Date().getTime() - 1000 * 60 * 60 * 12   // 半天之前的时间戳 (作为触发点)
// const STOPTIMESTAMP = new Date().getTime() - 3 * 600000 - 60000    // 20min之前的时间戳 (作为触发点)
const STOPTIMESTAMP = new Date().getTime() - 600000 - 60000    // 10min之前的时间戳 (作为触发点)

urlList.forEach(item => {
    if (item.url === window.location.href) {
        flag = true
        dataInfo = item
    }
})

if (window.location.href === "https://twitter.com/home") {
    chrome.runtime.sendMessage({ type: "startScan", data: urlList }, function (response) { });
}

console.log("是否会对本页面的数据进行爬取:", flag);

function Content() {
    const [mainModalVisiable, setMainModalVisiable] = useState(false)

    // 如果符合条件就开始获取数据
    if (flag) {
        getData()
    }
    function getData() {

        // 这里还需要再次测试确认数据获取的准确性

        console.log(STOPTIMESTAMP, formatTime(STOPTIMESTAMP));

        // 屏幕开始滚动并在滚动的过程中获取数据
        windowScroll(getTwitter)

        function windowScroll(getDataFunction) {
            clearTimeout(timer)
            function scrollAgain() {
                // console.log("开始获取时间节点");
                let ifScroll = true
                const Time = Array.from(document.querySelectorAll("time"))
                // 等待页面有内容了才开始循环
                if (Time.length) {
                    // 问题的临时解决方法: 每次只对比最后一个time节点, 但是这样有可能会在最后一个正好命中广告 / 转发的内容(小概率)
                    // 后来发现碰到的概率还挺大的 那就对比这个和前面两个节点 如果都小于就不滚 否则还是滚一次
                    console.log("开始本轮判断");
                    const itemTimeStamp1 = new Date(Time[Time.length - 1]?.dateTime).getTime()
                    const itemTimeStamp2 = new Date(Time[Time.length - 2]?.dateTime).getTime()
                    console.log(Time, itemTimeStamp1, itemTimeStamp2);
                    // 页面滚动的种终止条件
                    if (itemTimeStamp1 < STOPTIMESTAMP && itemTimeStamp2 < STOPTIMESTAMP) {
                        console.log(Time[Time.length - 1], Time[Time.length - 2]);
                        console.log(formatTime(itemTimeStamp1), "|", formatTime(itemTimeStamp2), "|", formatTime(STOPTIMESTAMP));
                        console.log("不用滚动了");
                        ifScroll = false
                    }
                    getDataFunction() // 解决如果页面不滚动就完全没数据

                    if (ifScroll) {
                        // console.log("滚动+再执行一次");
                        window.scrollBy(0, window.innerHeight * 3)
                        clearTimeout(timer)
                        timer = setTimeout(function () {
                            getDataFunction()
                            scrollAgain()
                        }, [3000])
                    } else {
                        const downLoadData = filterData(removeTheSame(resultData))
                        const content = {
                            result: downLoadData.length,
                            time: formatTime(new Date().getTime()),
                            task: dataInfo.type + "_" + dataInfo.keywords,
                            timeSection: `${formatTime(STOPTIMESTAMP)} => ${formatTime(new Date().getTime())}`,// 本次获取的时间区间
                            data: downLoadData
                        }
                        console.log("这里是本轮程序终止点 所有数据获取完毕,开始提交数据到background", downLoadData);
                        downloadFile(content, dataInfo) // 上传到服务器

                        // 这一步必须等到所以内容获取完成后执行 之前放在上面就会有问题 因为有很多异步操作
                        setTimeout(function () {
                            chrome.runtime.sendMessage({
                                type: "parseLabels",
                                data: downLoadData, // 最终会下载的数据
                                dataInfo: dataInfo,
                                content: content // 最终上传的所有内容
                            }, function (response) {
                                displayData = response.data
                                // console.log(displayData);
                                setMainModalVisiable(true)
                                flag = false
                            });
                        }, [2000])
                    }
                } else {
                    // 如果没有获取到内容说明也没还没加载出来(再等待一会儿重新执行滚动)
                    console.log("没有获取到内容 页面加载有问题");

                    clearTimeout(timer)
                    timer = setTimeout(function () {
                        scrollAgain()
                    }, [4000])
                }
            }

            // 第一次执行 这里需要设置延时器等待屏幕加载 
            timer = setTimeout(function () {
                // console.log("first scroll");
                scrollAgain()
            }, [4000])
        }

        // 获取Twitter数据
        function getTwitter() {
            let queryWhole = "article"
            let queryTime = "time"
            // let queryContent = ".css-901oao.r-18jsvk2.r-37j5jr.r-a023e6.r-16dba41.r-rjixqe.r-bcqeeo.r-bnwqim.r-qvutc0 span"
            let queryUser = "a.css-4rbku5.css-18t94o4.css-1dbjc4n.r-1loqt21.r-1wbh5a2.r-dnmrzs.r-1ny4l3l"
            let queryInteract = ".css-1dbjc4n.r-1ta3fxp.r-18u37iz.r-1wtj0ep.r-1s2bzr4.r-1mdbhws"
            let articles = Array.from(document.querySelectorAll(queryWhole))

            // console.log(articles);
            articles.forEach((item, index) => {
                const timeNode = Array.from(item.querySelectorAll(queryTime))[0]

                // articles中获取不到时间的为广告
                if (timeNode) {
                    // console.log("article", item);
                    // console.log("time", timeNode, timeNode.dateTime);
                    // console.log("articleURL", timeNode.parentNode.href);
                    // console.log("content", content);
                    // console.log("user", Array.from(item.querySelectorAll(queryUser))[0] || "");
                    // console.log("replayNum", Array.from(item.querySelectorAll(queryInteract))[0]?.ariaLabel);

                    let replayNum = 0
                    let retweetNum = 0
                    let likeNum = 0
                    const interactNums = Array.from(item.querySelectorAll(queryInteract))[0]?.ariaLabel.split(",")
                    if (interactNums?.length) { // 有可能存在评论点赞转发都没有的情况
                        interactNums.forEach((item) => {
                            if (item.includes("replies")) {
                                replayNum = Number(item.match(/\d+/g)[0])
                            }
                            if (item.includes("Retweets")) {
                                retweetNum = Number(item.match(/\d+/g)[0])
                            }
                            if (item.includes("likes")) {
                                likeNum = Number(item.match(/\d+/g)[0])
                            }
                        })
                        // console.log(replayNum, retweetNum, likeNum);
                    }

                    const obj = {
                        timeStamp: new Date(timeNode.dateTime).getTime(),
                        time: timeNode.dateTime,
                        articleURL: timeNode.parentNode.href,
                        content: item.textContent,
                        user: Array.from(item.querySelectorAll(queryUser))[0]?.href,
                        replayNum,
                        retweetNum,
                        likeNum,
                    }
                    resultData.push(obj)
                }
            })
        }

        // 内容上传
        function downloadFile(content, dataInfo) {
            const { type, keywords } = dataInfo
            const time = switchTime(new Date().getTime())
            const filename = `${type}_${keywords}_${time}.json`
            const downloadContent = JSON.stringify(content)

            var file = new File([downloadContent], filename, { type: "text/json;charset=UTF-8", })
            if (content.result) {
                console.log("准备上传:", file);
                // console.log(content);
                uploadFile(file)
            } else {
                console.log("这10min内没有更新的数据");
            }
        }


        // 去掉重复项
        const removeTheSame = (oldData) => {
            let newArr = {}
            oldData.forEach(item => {
                newArr[item.articleURL] = item
            })
            console.log("去掉重复项:", Object.values(newArr));
            return Object.values(newArr)
        }

        // 筛选出stopTimeStamp时间后面的所有数据
        const filterData = (oldData) => {
            // 对data做一下筛选: 只保存stopTimeStamp这个节点到现在的内容
            let filteredData = []
            oldData.forEach(item => {
                const itemTimeStamp = item.timeStamp
                // console.log(formatTime(itemTimeStamp), "|", formatTime(stopTimeStamp));
                if (itemTimeStamp > STOPTIMESTAMP) {
                    // 在这个stopTimeStamp之内就筛选出来
                    filteredData.push(item)
                }
            })
            console.log("根据时间筛选之后的数据filteredData", filteredData);
            return filteredData
        }
    }

    return (
        <div className="CRX-content">
            <div
                className="content-entry CRX-antd-diy"
                onClick={() => {
                    setMainModalVisiable(true)
                }}
            ></div>
            {mainModalVisiable ? (
                <PopModal
                    displayData={displayData}
                    onClose={() => {
                        setMainModalVisiable(false)
                    }}
                />
            ) : null}
        </div>
    )
}

// 创建id为CRX-container的div
const app = document.createElement('div')
app.id = 'CRX-container'
// 将刚创建的div插入body最后
document.body.appendChild(app)
// 将ReactDOM插入刚创建的div
const container = createRoot(app)
container.render(<Content />)

