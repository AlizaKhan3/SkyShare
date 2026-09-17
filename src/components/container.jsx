import { LuFiles } from "react-icons/lu";
import { PiTextAlignLeftBold } from "react-icons/pi";
import { Button } from "antd";
import "./style.scss";
import AppButton from "./gradient-button";
import { useEffect, useState, useRef } from "react";
import MyDropzone from "./dropzone";
import AcceptedFilesList from "./DraggedFilesList";
import { MdDeleteOutline } from "react-icons/md";
import { FaDownload } from "react-icons/fa6";
import {
    saveText,
    clearText,
    subscribeText,
    saveFiles,
    clearFiles,
    subscribeFiles,
    uploadFile,
    getRoomId,
} from "../db/index.js";
import JSZip from "jszip";
import { saveAs } from "file-saver";

const AppContainer = () => {
    const [type, setType] = useState("text");
    const [textValue, setTextValue] = useState("");
    const [files, setFiles] = useState([]);
    const [tempFiles, setTempFiles] = useState([]);
    const [isText, setIsText] = useState(false);
    const [saving, setSaving] = useState(false);
    const [networkStatus, setNetworkStatus] = useState("Connecting to your Wi‑Fi room…");

    const textAreaRef = useRef();
    /** While true, remote polls must not overwrite what the user is typing */
    const isEditingRef = useRef(false);

    const resizeTextArea = () => {
        if (!textAreaRef.current) return;
        textAreaRef.current.style.height = "100px";
        textAreaRef.current.style.height = textAreaRef.current.scrollHeight + 12 + "px";
    };

    const onDrop = async (acceptedFiles) => {
        setTempFiles([...tempFiles, ...acceptedFiles]);

        try {
            const uploaded = await Promise.all(
                acceptedFiles.map((file) => uploadFile(file))
            );
            const nextFiles = [...files, ...uploaded];
            setFiles(nextFiles);
            await saveFiles(nextFiles);
        } catch (error) {
            console.error("File upload failed", error);
            alert(error?.message || "File upload failed. Check Appwrite bucket permissions.");
        } finally {
            setTempFiles([]);
        }
    };

    const clearFilesSection = async () => {
        try {
            await clearFiles();
            setFiles([]);
        } catch (error) {
            console.error("Clear files failed", error);
            alert(error?.message || "Could not clear files.");
        }
    };

    const downloadAll = () => {
        const filename = "SkyShare-Files";
        const zip = new JSZip();
        const folder = zip.folder("files");

        files.forEach((file) => {
            const blobPromise = fetch(file.url).then((response) => {
                if (response.status === 200 || response.status === 0) {
                    return response.blob();
                }
                return Promise.reject(new Error(response.statusText));
            });
            folder.file(file.name, blobPromise);
        });

        zip.generateAsync({ type: "blob" })
            .then((blob) => saveAs(blob, filename))
            .catch((e) => console.log(e));
    };

    const saveTextChanges = async () => {
        setSaving(true);
        try {
            await saveText(textValue);
            isEditingRef.current = false;
            setIsText(!!textValue);
        } catch (error) {
            console.error("Save text failed", error);
            alert(error?.message || "Could not save text. Check Appwrite setup.");
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        let active = true;
        let unsubText = () => {};
        let unsubFiles = () => {};

        const connect = async () => {
            try {
                await getRoomId();
                if (!active) return;
                setNetworkStatus("Only devices on your Wi‑Fi can see this · auto-clears after 10 min");

                unsubText();
                unsubFiles();

                unsubText = await subscribeText((text) => {
                    if (!active) return;
                    // Don't wipe the textarea while the user is typing an unsaved draft
                    if (isEditingRef.current) return;
                    setTextValue(text || "");
                    setIsText(!!text);
                });
                unsubFiles = await subscribeFiles((nextFiles) => {
                    if (!active) return;
                    setFiles(Array.isArray(nextFiles) ? nextFiles : []);
                });
            } catch (error) {
                console.error("Network room / realtime failed", error);
                if (active) {
                    setNetworkStatus(error?.message || "Could not detect your Wi‑Fi network.");
                }
            }
        };

        connect();

        const onVisible = () => {
            if (document.visibilityState === "visible") {
                connect();
            }
        };
        document.addEventListener("visibilitychange", onVisible);

        return () => {
            active = false;
            document.removeEventListener("visibilitychange", onVisible);
            unsubText();
            unsubFiles();
        };
    }, []);

    const clearTextSection = async () => {
        try {
            await clearText();
            isEditingRef.current = false;
            setTextValue("");
            setIsText(false);
        } catch (error) {
            console.error("Clear text failed", error);
            alert(error?.message || "Could not clear text.");
        }
    };

    const links = textValue.match(/\bhttps?:\/\/\S+/gi) || [];

    return (
        <div className="flex items-center justify-center">
            <div className="p-6 bg-white rounded-lg flex flex-col items-center justify-center space-y-4 w-9/12 main-container" style={{ background: "#f4f4f4" }}>
                <div className="w-full flex p-1 text-gray-500 flex-col" style={{ background: "#f4f4f4" }}>
                    <div className="flex justify-between items-center">
                        {type === "text" ? (
                            <h1 className="break-all heading font-bold text-gray-900" style={{ fontSize: "34px" }}>Write Text</h1>
                        ) : (
                            <h1 className="break-all heading font-bold text-gray-900" style={{ fontSize: "34px" }}>Files</h1>
                        )}
                        <div className="gap-4 flex justify-evenly icons-div">
                            <PiTextAlignLeftBold onClick={() => setType("text")} style={{ height: "100px", width: "40px" }} className={type === "text" && "active-icon"} />
                            <LuFiles onClick={() => setType("files")} style={{ height: "100px", width: "40px" }} className={type === "files" && "active-icon"} />
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">{networkStatus}</p>
                    {type === "files" ? (
                        <div className="btns flex justify-between" style={{ gap: "5px", display: "flex", flexDirection: "row-reverse", margin: "10px 0px" }}>
                            <Button onClick={clearFilesSection} className="del-btn" size="small" type="secondary" ghost><MdDeleteOutline /> Delete All </Button>
                            <Button onClick={downloadAll} className="download-btn" size="small" type="secondary" ghost><FaDownload /> Download All </Button>
                        </div>
                    ) : (
                        <div className="btns flex justify-between" style={{ gap: "2px", display: "flex", flexDirection: "row-reverse", margin: "3px 0px" }} />
                    )}

                    <div className="w-full border border-dashed border-gray-400 flex flex-col p-4">
                        {type === "text" ? (
                            <div className="text-section">
                                <textarea
                                    className="textArea w-full border-none p-4 text-gray-700 rounded-md resize-none focus:outline-none "
                                    placeholder="Type something here..."
                                    ref={textAreaRef}
                                    onInput={resizeTextArea}
                                    value={textValue}
                                    onChange={(e) => {
                                        isEditingRef.current = true;
                                        setTextValue(e.target.value);
                                        setIsText(false);
                                    }}
                                />
                                <div className="display-url">
                                    {links.map((v, i) => (
                                        <div key={i}>
                                            <a href={v} target="_blank" rel="noopener noreferrer">{v}</a>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="files-section">
                                {tempFiles.length || files.length ? (
                                    <AcceptedFilesList tempFiles={tempFiles} files={files} onDrop={onDrop} />
                                ) : (
                                    <MyDropzone onDrop={onDrop} textElement={<p className="files-text">Drag n drop files here or <span>Click here</span> to select</p>} />
                                )}
                            </div>
                        )}
                    </div>
                    {type === "text" ? (
                        <div style={{ gap: "10px", display: "flex", flexDirection: "row-reverse", marginTop: "10px" }}>
                            {isText ? (
                                <AppButton
                                    title={"Copy"}
                                    onClick={() => {
                                        navigator.clipboard.writeText(textValue);
                                    }}
                                />
                            ) : (
                                <AppButton
                                    onClick={saveTextChanges}
                                    disabled={!textValue || saving}
                                    title={saving ? "Saving..." : "Save"}
                                />
                            )}
                            <Button onClick={clearTextSection} size="large" type="primary" ghost>Clear </Button>
                        </div>
                    ) : (
                        <div style={{ marginTop: "10px", gap: "10px", display: "flex", flexDirection: "row-reverse" }}>
                            <AppButton title={"Save"} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AppContainer;
