/*global chrome*/
import React from 'react';
import jsonData from "@/common/urlList.json"
import './popup.scss' // 作为popup所有页面的全局样式
// 在popup页面调试content script，仅用于开发环境，build前记得要注释掉
import '@/content'

const getStart = () => {
    chrome.runtime.sendMessage({ type: "startScan", data: jsonData.urlLists }, function (response) { });
}

// 迁移到V3之后不会自动执行了不知道为什么 后来发现这个操作如果不是需要手动的话本来就应该由content script来完成
// if (window.location.href === "https://twitter.com/home") {
//     getStart()
// }

function Popup() {
    return (
        <div className="App">
            <header className="App-header">
                <h1 className="App-title">Twitter Bot</h1>
            </header>
            <button className="niceButton" onClick={() => { getStart() }}>Twitter爬虫</button>
            {/* <UploadData /> */}
        </div >
    );
}



export default Popup