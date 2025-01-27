import React, { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import "./style.scss";

function MyDropzone({ textElement, onDrop }) {
    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop })

    return (
        <div className="drop-zone" {...getRootProps()}>
            <input {...getInputProps()} />
            <div>
                {textElement}
            </div>
        </div>
    )
}

export default MyDropzone;