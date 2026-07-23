import { Toaster } from "sonner";
import Overview from "../../components/member/overview/Overview";


export default function OverviewPage() {


  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="flex flex-col gap-4">
        <Overview />
      </div>
    </>
  );
}
