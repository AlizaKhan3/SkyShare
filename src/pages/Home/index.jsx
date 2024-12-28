import AppNavbar from "../../components/Navbar";
import "../Home/css/style.scss"

const HomePage = () => {
    return(
        <div className="main">
        <AppNavbar />
         <h1 className="text-3xl font-bold underline">
      Hello world!
    </h1>
        </div>
    )
} 

export default HomePage;