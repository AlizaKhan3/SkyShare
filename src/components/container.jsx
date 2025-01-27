import { LuFiles } from "react-icons/lu";
import { PiTextAlignLeftBold } from "react-icons/pi";
import { Button } from "antd";
import "./style.scss";
import AppButton from "./gradient-button";
import { useEffect, useState } from "react";
import { useRef } from "react";
import MyDropzone from "./dropzone";
import AcceptedFilesList from "./DraggedFilesList";
import { MdDeleteOutline } from "react-icons/md";
import { FaDownload } from "react-icons/fa6";
import { database, ref, set, onValue, remove, storage, storageRef, uploadBytesResumable, getDownloadURL } from "../db/index.js";
// import CodeEditor from "./CodeEditor.jsx";
import { collection, addDoc, db } from "../db/index.js";
import JSZip from "jszip";
import { saveAs } from "file-saver";

const AppContainer = () => {
    const [type, setType] = useState("text");
    const [textValue, setTextValue] = useState("");  //textvalue empty initially
    const [files, setFiles] = useState([]);
    const [tempFiles, setTempFiles] = useState([]);

    const textAreaRef = useRef();
    const resizeTextArea = (e) => {
        textAreaRef.current.style.height = "100px"
        textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 12 + 'px'
        console.log(textAreaRef.current.scrollHeight);
    }

    const onDrop = async acceptedFiles => {
        // console.log("Accepted File-->", acceptedFiles);
        setTempFiles([...tempFiles, ...acceptedFiles]);

        let arr = [];
        for (let i = 0; i < acceptedFiles.length; i++) {
            arr.push(uploadFileInDatabase(acceptedFiles[i], files.length + i))
            // console.log(acceptedFiles[i]);
        }

        const allFiles = await Promise.all(arr);
        setFiles([...files, ...allFiles]);

        setTempFiles([])

        set(ref(database, 'files-sharing/'), {
            files: [...files, ...allFiles]
        });
        // uploadFileInDatabase(acceptedFiles[0], 0);
    }

    // console.log("files-------->",files)

    // Uploading Files in Firebase Storage
    const uploadFileInDatabase = (file, i) => {
        return new Promise((resolve, reject) => {
            const fileRef = storageRef(storage, `files/file - ${i}`);
            const uploadTask = uploadBytesResumable(fileRef, file);

            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    console.log('Upload is ' + progress + '% done');
                    switch (snapshot.state) {
                        case 'paused':
                            console.log('Upload is paused');
                            break;
                        case 'running':
                            console.log('Upload is running');
                            break;
                    }
                },
                (error) => {
                    console.log("Unable to load your image", error)
                    reject(error);
                },
                () => {
                    getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                        console.log('File available at', downloadURL);
                        resolve({ url: downloadURL, type: file.type, name: file.name });
                    });
                }
            );
        })
    }

    //delete all files
    const clearFilesSection = async () => {
        await remove(ref(database, 'files-sharing/'));
        setFiles([]);
    };

    //download all files fn
    const downloadAll = () => {
        let filename = "SkyShare-Files";
        // const urls = files.map(value => value.url);
        // const urls = [
        //     "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRNSgGbqmow7OzxHkEu_F2x9Z91uA61XZaEHg&s"
        // ]
        const zip = new JSZip()
        const folder = zip.folder('files')
        // urls.forEach((url) => {
        files.forEach((file) => {
            const blobPromise = fetch(file.url)
                .then(function (response) {
                    console.log({ response })
                    if (response.status === 200 || response.status === 0) {
                        return Promise.resolve(response.blob());
                    } else {
                        return Promise.reject(new Error(response.statusText));
                    }
                })
                const name = file.name;
            // const name = url.substring(url.lastIndexOf('/'))
            folder.file(name, blobPromise)
        })

        zip.generateAsync({ type: "blob" })
            .then(blob => saveAs(blob, filename))
            .catch(e => console.log(e));
    }

    //write
    const saveTextChanges = () => {
        set(ref(database, 'text-sharing/'), {
            text: textValue,
        });
        // console.log("textval-->", textValue)
    }

    const [isText, setIsText] = useState(false);

    //read
    useEffect(() => {
        const textRef = ref(database, 'text-sharing/');
        onValue(textRef, (snapshot) => {
            const data = snapshot.val();
            console.log("Data------>", data.text)
            // setTextValue(data.text)
            // if (isText) {
            //     setIsText(true);
            // }
            setTextValue(data?.text || ""); // Update textValue with the database value or empty if null
            setIsText(!!data?.text);
        });

        const fileRef = ref(database, 'files-sharing/');
        onValue(fileRef, (snapshot) => {
            const data = snapshot.val();
            setFiles(data.files);
        });
    }, [])

    //clear text section
    const clearTextSection = async () => {
        await remove(ref(database, 'text-sharing/'));
        setTextValue("");
        setIsText(false);
    }

    const links = textValue.match(/\bhttps?:\/\/\S+/gi) || []

    return (
        <div className="flex items-center justify-center" >
            <div className="p-6 bg-white rounded-lg flex flex-col items-center justify-center space-y-4 w-9/12 main-container" style={{ background: "#f4f4f4" }}>
                <div
                    className="w-full flex p-1 text-gray-500 flex-col" style={{ background: "#f4f4f4" }}>
                    <div className="flex justify-between items-center" >
                        {
                            type === "text"
                                ?
                                <h1 className="break-all heading font-bold text-gray-900" style={{ fontSize: "34px" }}>Write Text</h1>
                                :
                                <h1 className="break-all heading font-bold text-gray-900" style={{ fontSize: "34px" }}>Files</h1>
                        }
                        <div className="gap-4 flex justify-evenly icons-div ">
                            <PiTextAlignLeftBold onClick={() => setType("text")} style={{ height: "100px", width: "40px" }} className={type === "text" && "active-icon"} />

                            <LuFiles onClick={() => setType("files")} style={{ height: "100px", width: "40px" }} className={type === "files" && "active-icon"} />
                        </div>
                    </div>
                    {type === "files" ?
                        <div className="btns flex justify-between" style={{ gap: "5px", display: "flex", flexDirection: "row-reverse", margin: "10px 0px" }}>
                            <Button onClick={clearFilesSection} className="del-btn" size="small" type="secondary" ghost><MdDeleteOutline /> Delete All </Button>
                            <Button onClick={downloadAll} className="download-btn" size="small" type="secondary" ghost><FaDownload /> Download All </Button>
                        </div>
                        :
                        <div className="btns flex justify-between" style={{ gap: "2px", display: "flex", flexDirection: "row-reverse", margin: "3px 0px" }}>
                        </div>
                    }

                    <div className="w-full border border-dashed border-gray-400 flex flex-col p-4">
                        {type === "text" ?
                            <div className="text-section">
                                <textarea
                                    className="textArea w-full border-none p-4 text-gray-700 rounded-md resize-none focus:outline-none "
                                    placeholder="Type something here..."
                                    ref={textAreaRef}
                                    onInput={resizeTextArea}
                                    value={textValue}
                                    onChange={(e) => {
                                        setTextValue(e.target.value)
                                        setIsText(false)
                                    }}
                                />
                                <div className="display-url">
                                    {links.map((v, i) => {
                                        console.log(links);
                                        return (
                                            <div key={i}>
                                                <a href={v} target="_blank" rel="noopener noreferrer"> {v}</a>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                            :
                            <div className="files-section">
                                {tempFiles.length || files.length
                                    ?
                                    <AcceptedFilesList tempFiles={tempFiles} files={files} onDrop={onDrop} />
                                    :
                                    <MyDropzone onDrop={onDrop} textElement={<p className="files-text">Drag n drop files here or <span>Click here</span> to select</p>} />
                                }
                            </div>
                        }
                    </div>
                    {
                        type === "text" ?
                            <div style={{ gap: "10px", display: "flex", flexDirection: "row-reverse", marginTop: "10px" }}>
                                {isText ?
                                    <AppButton title={"Copy"} onClick={() => {
                                        navigator.clipboard.writeText(textValue);
                                    }} />
                                    :
                                    <AppButton onClick={saveTextChanges} disabled={textValue ? false : true} title={"Save"}></AppButton>
                                }
                                <Button onClick={clearTextSection} size="large" type="primary" ghost>Clear </Button>
                            </div>
                            : < div style={{ marginTop: "10px", gap: "10px", display: "flex", flexDirection: "row-reverse" }}>
                                <AppButton title={"Save"}></AppButton>
                                {/* <Button onClick={clearFilesSection} size="large" type="primary" ghost>Clear </Button> */}
                            </div>
                    }
                </div>
            </div>
        </div>
    )
}

export default AppContainer;