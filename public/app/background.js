/*global chrome*/
let urlIndex = 0
let urlList = []

chrome.browserAction.onClicked.addListener(function (tab) {
   // Send a message to the active tab
   chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      var activeTab = tabs[0];
      chrome.tabs.sendMessage(activeTab.id, { "message": "clicked_browser_action" });
   });
});



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
         console.log("本次上传的数据列表:", request.data, "数据信息:", request.dataInfo, request.content);
         closeTabs(request.dataInfo.url)
         return true;
      }
   }
);

// let timer = null
function openTabs() {
   // 只打开一轮
   function openOneRound() {
      if (urlIndex < urlList.length) {
         let openUrl = urlList[urlIndex].url
         console.log("打开URL:", openUrl);
         chrome.tabs.create({ url: openUrl })
         urlIndex++;
         openTabs()
      } else {
         urlIndex = 0
      }
   }

   openOneRound()

   // clearTimeout(timer)
   // timer = setTimeout(function () {
   //    openOneRound()
   // }, [720000])
}


function closeTabs(url) { // 3秒左右关闭
   const time = 4000 + Math.round(Math.random() * 3000)
   setTimeout(function () {
      chrome.tabs.query({ url: url }, function (tabs) {
         chrome.tabs.remove(tabs[0].id, function () { });
      })
   }, time)
}



// 文件下载
// function downloadFile(content, dataInfo) {
//    const { type, keywords } = dataInfo
//    const time = switchTime(new Date().getTime())
//    const filename = `${type}_${keywords}_${time}.json`
//    const downloadContent = JSON.stringify(content)

//    var blob = new Blob([downloadContent], { type: "text/json;charset=UTF-8" });
//    var url = window.URL.createObjectURL(blob);
//    console.log(blob, url);

//    setTimeout(function () {
//       chrome.downloads.download({
//          url: url,
//          filename: filename
//       })
//    }, 2000)
// }


