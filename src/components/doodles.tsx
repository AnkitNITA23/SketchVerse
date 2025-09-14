import { Palmtree, Brush, Clapperboard, Rocket, Component, Gamepad2, BrainCircuit } from "lucide-react";

const Doodle = ({ as: Comp = 'div', className, style, ...props }) => (
    <Comp
      className={`doodle text-gray-700 dark:text-gray-400 ${className}`}
      style={style}
      {...props}
    />
);


export function Doodles() {
    return (
        <div className="absolute inset-0 -z-10 overflow-hidden">
            <Doodle as={Brush} className="w-16 h-16 top-[10%] left-[5%]" style={{ animationDelay: '0.2s' }}/>
            <Doodle as={Rocket} className="w-20 h-20 top-[15%] right-[10%]" style={{ animationDelay: '0.5s' }}/>
            <Doodle as={Gamepad2} className="w-24 h-24 bottom-[10%] left-[15%]" style={{ animationDelay: '0.8s' }}/>
            <Doodle as={Clapperboard} className="w-12 h-12 bottom-[20%] right-[5%]" style={{ animationDelay: '1.1s' }}/>
            <Doodle as={BrainCircuit} className="w-20 h-20 top-[40%] left-[20%]" style={{ animationDelay: '1.4s' }}/>
            <Doodle as={Component} className="w-16 h-16 bottom-[5%] right-[25%]" style={{ animationDelay: '0.3s' }}/>
            <Doodle as={Palmtree} className="w-28 h-28 top-[50%] right-[15%]" style={{ animationDelay: '0.7s' }}/>
        </div>
    )
}
