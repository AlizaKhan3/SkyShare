import AppContainer from "../../components/container";
import AppFooter from "../../components/footer";
import AppNavbar from "../../components/Navbar";
import "../Home/css/style.scss"


const HomePage = () => {
    return (
        <div>
            <AppNavbar />
           <AppContainer/>
           <AppFooter />
        </div>
    )
}

export default HomePage;