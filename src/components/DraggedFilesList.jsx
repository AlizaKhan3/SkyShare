import { FaRegFile } from "react-icons/fa6";
import MyDropzone from "./dropzone";
import { GoPlus } from "react-icons/go";
import { AiOutlineHtml5 } from "react-icons/ai";
import { AiOutlineFilePdf } from "react-icons/ai";
import { AiOutlineFileImage } from "react-icons/ai";
import { BsFiletypePng } from "react-icons/bs";
// import { AiOutlineFileJpg } from "react-icons/ai";
import { IoLogoCss3 } from "react-icons/io5";
import { AiOutlineJavaScript } from "react-icons/ai";
import { BsFiletypeJsx } from "react-icons/bs";
import { PiFileJpg } from "react-icons/pi";
import AppLoader from "../components/loader.jsx";
import loader from "../assets/giphy.gif";
import tempLoader from "../assets/loadingGif.gif";



const AcceptedFilesList = ({ tempFiles, files, onDrop }) => {

    return (
        <div className="files-list">
            {
                files.map((value, i) => {
                    let icon;
                    switch (value.type) {
                        case ("text/html"):
                            icon = <AiOutlineHtml5 />
                            break;
                        case ("text/javascript"):
                            icon = <AiOutlineJavaScript />
                            break;
                        // case ("image/jpeg" || "image/jpg"):
                        //     icon = <PiFileJpg />
                        //     break;
                        // case ("image/png"):
                        //     icon = <BsFiletypePng />
                        //     break;
                        case ("application/pdf"):
                            icon = <AiOutlineFilePdf />
                            break;
                        case ("text/css"):
                            icon = <IoLogoCss3 />
                            break;
                        case ("text/jsx"):
                            icon = <BsFiletypeJsx />
                            break;
                        // case ("image/img"):
                        //     icon = <AiOutlineFileImage />
                        //     break;
                        default:
                            icon = <FaRegFile />
                    }
                    return (
                        <a href={value.url} target="_blank" download={value.url} key={i} >

                        <div>
                            {value.type.indexOf("image") !== -1 ?
                                <img src={value.url} alt={<AiOutlineFileImage />} />
                                :
                                <>
                                    {/* <FaRegFile /> */}
                                    {icon}
                                    <p>{value.name}</p>
                                    {/* <p> {value.name.slice(0, 10)} <b>{value.name.slice(value.name.lastIndexOf("."))}</b></p> */}
                                </>
                            }
                        </div>
                        </a>
                    )
                }
                )
            }
            {
                tempFiles.map((value, i) => {
                    let icon;
                    switch (value.type) {
                        case ("text/html"):
                            icon = <AiOutlineHtml5 />
                            break;
                        case ("text/javascript"):
                            icon = <AiOutlineJavaScript />
                            break;
                        // case ("image/jpeg" || "image/jpg"):
                        //     icon = <PiFileJpg />
                        //     break;
                        // case ("image/png"):
                        //     icon = <BsFiletypePng />
                        //     break;
                        case ("application/pdf"):
                            icon = <AiOutlineFilePdf />
                            break;
                        case ("text/css"):
                            icon = <IoLogoCss3 />
                            break;
                        case ("text/jsx"):
                            icon = <BsFiletypeJsx />
                            break;
                        // case ("image/img"):
                        //     icon = <AiOutlineFileImage />
                        //     break;
                        default:
                            icon = <FaRegFile />
                    }
                    return (
                        // animate-pulse flex space-x-4
                        // <a href={value.url} download key={i} >
                        <div className="temp-files" key={i}>
                            {value.type.indexOf("image") !== -1 ?
                                <img src={URL.createObjectURL(value)} alt={<AiOutlineFileImage />} />
                                :
                                <>                                    {/* <FaRegFile /> */}
                                    {icon}
                                    <p>{value.name}</p>
                                    {/* <p> {value.name.slice(0, 10)} <b>{value.name.slice(value.name.lastIndexOf("."))}</b></p> */}
                                </>
                            }
                            <img className="upload-loader" src={loader} alt="loading" />
                        </div>
                        // </a>
                         )
                },
                <AppLoader/>

                )
            }
           
            <div>
                <MyDropzone onDrop={onDrop} textElement={
                    <div>
                        <GoPlus />
                        <span>Add Files
                            <br />
                            <p style={{ letterSpacing: "-0.5px" }}>                        (up to 5 MB)
                            </p>
                        </span>
                    </div>
                } />
            </div>
        </div>
    )
}

export default AcceptedFilesList;