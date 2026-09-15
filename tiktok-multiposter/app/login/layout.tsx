import LandingAiSuite from "./LandingAiSuite";
import LandingExpansion from "./LandingExpansion";
import "./landing-next.css";

export default function LoginLayout({children}:{children:React.ReactNode}){
  return <>{children}<LandingAiSuite/><LandingExpansion/></>;
}
