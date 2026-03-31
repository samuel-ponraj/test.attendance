import { Toaster } from "sonner";
import Overview from "../../components/member/overview/Overview";


export default function OverviewPage() {


  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="flex flex-col gap-4 py-2 md:gap-6 md:py-4">
        <Overview />
      </div>
    </>
  );
}
