/*global chrome*/
import React from 'react';
import logo from './logo.svg';
import './App.css';
import UploadData from "./uploadData"
import { urlList } from "./urlList.json"


export default function App({ isExt }) {


  const getStart = () => {
    chrome.runtime.sendMessage({ type: "startScan", data: urlList }, function (response) { });
  }


  return (
    <div className="App">
      <header className="App-header">
        {isExt ?
          <img src={chrome.runtime.getURL("static/media/logo.svg")} className="App-logo" alt="logo" />
          :
          <img src={logo} className="App-logo" alt="logo" />
        }
        <h1 className="App-title">Twitter Bot</h1>
      </header>
      <button className="niceButton" onClick={() => { getStart() }}>Twitter爬虫</button>
      {/* <UploadData /> */}
    </div >
  );
}
// 当前我使用的node版本为 14.17.0