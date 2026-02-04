'use client'
import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";

const SplashLoader = () => {
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		const interval = setInterval(() => {
			setProgress((p) => (p >= 100 ? 100 : p + 10));
		}, 100); // fills in ~1s

		return () => clearInterval(interval);
	}, []);

	return (
            <div className="flex flex-start min-h-screen justify-center bg-black px-4 animate-fade-in">
			<div className="flex h-[90vh] sm:min-h-screen w-full max-w-sm flex-col items-center justify-center gap-6">
				<img
					src="/logo/KDA-logo-white.png"
					alt="App Logo"
					className="w-44 sm:w-52 md:w-60 lg:w-64"
				/>

				<Progress
					value={progress}
					className="h-1 w-2/3 max-w-[150px] bg-white/20"
				/>
			</div>
		</div>
	);
};

export default SplashLoader;
