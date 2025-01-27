import { PiHeartFill } from "react-icons/pi";

const AppFooter = () => {
    return(
        <div className="text-center">
        <div class="flex justify-center items-center gap-1" style={{marginTop:"70px"}}>
                    <p>Made by Aliza Khan with  </p>
                    <PiHeartFill style={{color:"red"}} />
        </div>
        <p>Follow me on  </p>
        </div>

    )
}

export default AppFooter;