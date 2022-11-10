/*global chrome*/
/* src/content.js */
import React from 'react';
import ReactDOM from 'react-dom';
import Frame, { FrameContextConsumer } from 'react-frame-component';
import App from "./App";
import { urlList } from "./urlList.json"
import { uploadFile } from "./uploadData"
import { switchTime, formatTime } from "./utils"

// let urlList = ["https://twitter.com/search?q=defi%20exploit&src=typed_query&f=live",
//   "https://twitter.com/search?q=crypto%20exploit&src=typed_query&f=live",
//   "https://twitter.com/peckshieldalert"]
let flag = false
let dataInfo = {}
urlList.forEach(item => {
  if (item.url === window.location.href) {
    flag = true
    dataInfo = item
  }
})
console.log("是否会对本页面的数据进行爬取", flag);

if (flag) {
  let data = []
  let timer = null

  const lastTimeStamp = new Date().getTime() - 600000 - 60000 // 10min之前的时间戳 (作为触发点)
  console.log(lastTimeStamp, formatTime(lastTimeStamp));


  const getTwitter = () => {

    let queryWhole = "article"
    let queryTime = "time"
    let queryContent = ".css-901oao.r-18jsvk2.r-37j5jr.r-a023e6.r-16dba41.r-rjixqe.r-bcqeeo.r-bnwqim.r-qvutc0 span"
    let queryUser = "a.css-4rbku5.css-18t94o4.css-1dbjc4n.r-1loqt21.r-1wbh5a2.r-dnmrzs.r-1ny4l3l"
    let queryInteract = ".css-1dbjc4n.r-1ta3fxp.r-18u37iz.r-1wtj0ep.r-1s2bzr4.r-1mdbhws"
    let articles = Array.from(document.querySelectorAll(queryWhole))

    console.log(articles);
    articles.forEach((item, index) => {
      let content = ""
      Array.from(item.querySelectorAll(queryContent)).forEach(oneContent => {
        content += oneContent.textContent
      })
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
          time: timeNode.dateTime,
          articleURL: timeNode.parentNode.href,
          content,
          user: Array.from(item.querySelectorAll(queryUser))[0]?.href,
          replayNum,
          retweetNum,
          likeNum,
        }
        data.push(obj)

      }

    })


    console.log(data);
    // return data

    // 对data做一下筛选: 只保存十分钟之前到现在的内容
    let filteredData = []

    data.forEach(item => {
      const itemTimeStamp = new Date(item.time).getTime()

      // console.log(formatTime(itemTimeStamp), "|", formatTime(lastTimeStamp));
      if (itemTimeStamp > lastTimeStamp) {
        // 在这10分钟之内的内容就上传
        filteredData.push(item)
      }
    })

    console.log("筛选之后的数据filteredData", filteredData);
    return filteredData

  }



  const windowScroll = () => {
    // 1. 进入目标页面之后
    // 2. 获取当前所显示内容的所有time 找到最前面的time对比与上一次截止时间戳(浏览器缓存/直接当前时间戳-10min)
    // 3. 对比一次屏幕就滚动一段长度 如果一直对比到如果某个时间小于了这个时间戳就停止滚动 再开始执行后续的爬取
    clearTimeout(timer)



    function scrollAgain() {

      console.log("开始判断是否滚动");
      let ifScroll = true
      // 这里我都采用以中国标准时间为准
      const Time = Array.from(document.querySelectorAll("time"))

      // 如果没有获取到内容说明也没还没加载出来
      // 不做判断的话会陷入死循环
      if (Time.length) {
        Time.forEach(time => {
          const itemTimeStamp = new Date(time.dateTime).getTime()

          // 如果出现了在当前时间戳之前的 (说明可以不用再滚动了)
          if (itemTimeStamp < lastTimeStamp) {
            console.log("不用滚动了");
            ifScroll = false
          }
        })
        if (ifScroll) {
          console.log("滚动+再执行一次");
          window.scrollBy(0, window.innerHeight * 3)
          scrollAgain()
        } else {
          // 如果滚动到合适的内容就可以开始获取数据了
          getStart()
          return null
        }
      } else {
        console.log("没有获取到内容 页面加载有问题");

        clearTimeout(timer)
        timer = setTimeout(function () {
          scrollAgain()
        }, [4000])
      }
    }


    // 这里需要设置延时器等待屏幕加载
    timer = setTimeout(function () {
      scrollAgain()
    }, [4000])

  }


  const getStart = () => {
    const data = getTwitter()
    const content = {
      result: data.length,
      time: formatTime(new Date().getTime()),
      task: dataInfo.type + "_" + dataInfo.keywords,
      data: data
    }
    downloadFile(content, dataInfo)
    // 等到确认内容发送成功后 => 发送到background⾥去 

    setTimeout(function () {

      chrome.runtime.sendMessage({ type: "parseLabels", data: data, dataInfo: dataInfo }, function (response) { });
    }, [2000])

    // window.close()
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

  windowScroll()

}


const Main = () => {

  return (
    <Frame head={[<link type="text/css" rel="stylesheet" href={chrome.runtime.getURL("/static/css/content.css")} ></link>]}>
      <FrameContextConsumer>
        {
          ({ document, window }) => {
            return <App document={document} window={window} isExt={true} />
          }
        }
      </FrameContextConsumer>
    </Frame>
  )
}




const app = document.createElement('div');
app.id = "my-extension-root";

document.body.appendChild(app);
ReactDOM.render(<Main />, app);
