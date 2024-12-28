import { LuFiles } from "react-icons/lu";
import { PiTextAlignLeftBold } from "react-icons/pi";
import { Button } from "antd";

const AppContainer = () => {
    return (
        // min-h-screen
        <div className="flex items-center justify-center" >
            <div className="p-6 bg-white rounded-lg shadow-lg flex flex-col items-center shadow-xl justify-center space-y-4 w-9/12">
                {/* <h2 className="text-xl font-semibold text-gray-800">Drag & Drop Your Files Here</h2> */}

                {/* Drag-and-Drop Area */}
                {/* <h2 className="text-xl font-semibold text-gray-800">Write Text here</h2> */}

                <div
                    className="w-full h-80 flex p-4 text-gray-500 flex-col">
                    <div className="flex justify-between">
                        <h2 className="break-all text-xl font-bold text-gray-900 py-4">Write Text here</h2>
                        <div className="flex justify-evenly gap-7">
                            <LuFiles />
                            <PiTextAlignLeftBold />
                        </div>
                    </div>
                    <div className="w-full h-60 border-2 border-dashed border-gray-400 flex flex-col p-4">
                        <textarea
                            className="w-full h-full border-none p-4 text-gray-700 rounded-md resize-none focus:outline-none"
                            placeholder="Type something here..."
                        />
                    </div>
                    {/* <span>Drag files here</span> */}
                </div>
                <button class=" ring-offset-2 ring-2">Save Changes</button>
                <button class="... ring-offset-2 ring">Button B</button>
                <Button>Save</Button>

            </div>
        </div>
    )
}

export default AppContainer;