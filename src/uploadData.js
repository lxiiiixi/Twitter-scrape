import React, { useState } from 'react';
import AWS from 'aws-sdk'
import { getDayTime } from "./utils"

const S3_BUCKET = 'fp-website-1';
const REGION = 'us-east-1';

AWS.config.update({
    accessKeyId: 'AKIA37IEKUUURWPU22QU',
    secretAccessKey: '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'
})


const myBucket = new AWS.S3({
    params: { Bucket: S3_BUCKET },
    region: REGION
})

export const uploadFile = (file) => {

    let subFileName = getDayTime(new Date())

    const params = {
        ACL: 'public-read',
        Body: file,
        Bucket: S3_BUCKET,
        ContentType: 'text/json;charset=UTF-8',
        Key: `scrapy_twitter_data/${subFileName}/${file.name}`
    };

    // console.log(file, params);


    // putObject为分段上传使用的方法
    myBucket.putObject(params)
        .on('httpUploadProgress', (evt) => {
            // setProgress(Math.round((evt.loaded / evt.total) * 100))
        })
        .send(function (err, data) {
            if (err) {
                console.log("Something went wrong");
                console.log(err.code);
                console.log(err.message);
            } else {
                console.log(data.response, file);
                console.log("SEND FINISHED");
            }
        });
}



const UploadData = () => {

    const [progress, setProgress] = useState(0);
    const [selectedFile, setSelectedFile] = useState(null);

    const handleFileInput = (e) => {
        setSelectedFile(e.target.files[0]);
    }


    return <div>
        <div>Progress: {progress}%</div>
        <input type="file" onChange={handleFileInput} />
        <button onClick={() => uploadFile(selectedFile)}> Upload to S3</button>
    </div>
}

export default UploadData;