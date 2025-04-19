import { SignIn } from '@clerk/nextjs';

export default function Signin() {
  return <div className="h-screen flex justify-center items-center w-screen lg:h-screen bg-cover bg-center relative" style={{
    backgroundImage: `linear-gradient(to right, rgba(255, 255, 255, 0) -50%, #fdfcf7 110%), url('/place.jpg')`,
  }}><SignIn></SignIn></div>
}