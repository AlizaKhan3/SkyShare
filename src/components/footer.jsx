import { PiHeartFill } from "react-icons/pi";
import { FaGithub } from "react-icons/fa6";
import { FaLinkedin } from "react-icons/fa";

const AppFooter = () => {
    return (
        // <div className="text-center">
        <div class="flex justify-center items-center gap-2 mb-4" style={{ marginTop: "70px", color:"#0D3A71", fontWeight:"bold" }}>
            {/* <p>Made by Aliza Khan </p> */}
            {/* <PiHeartFill style={{color:"red"}} /> */}
            <p>Follow me on</p>
            <div class="flex justify-center items-center gap-2" >
                <a href="https://github.com/AlizaKhan3" target="_blank"><FaGithub className="h-10" /></a>
                <a href="https://www.linkedin.com/in/aliza-khan3/" target="_blank"><FaLinkedin /></a>
            </div>
        </div>
        // </div>

    )
}

export default AppFooter;