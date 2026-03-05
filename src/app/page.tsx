import { Button } from "@/components/ui/button";
import Typography from "@/components/ui/typography";
import Image from "next/image";
import Link from "next/link";
import { FiSearch } from "react-icons/fi";
import { IoIosArrowForward } from "react-icons/io";

const workspaces = [
  { id: 1, name: "Slack-clone", initials: "SC", members: 2 },
  { id: 2, name: "surdsdaw", initials: "S", members: 1 },
  { id: 3, name: "workspace2", initials: "W", members: 1 },
  { id: 4, name: "cach roi ten", initials: "CR", members: 1 },
  { id: 5, name: "gi nua day", initials: "GN", members: 1 },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F8F8F8]">
      <div className="mx-auto max-w-7xl px-8 py-8">
        {/* Header */}
        <header className="mb-16 flex flex-col items-center justify-center">
          <Image
            src="https://a.slack-edge.com/bv1-13/slack_logo-ebd02d1.svg"
            alt="Slack"
            width={120}
            height={120}
          />
          <div className="mt-3 flex items-center gap-2 text-sm">
            <Typography variant="muted" as="span" className="text-[#616061]">
              Confirmed as
              <Typography
                text=" kingkiu1304@gmail.com"
                className="text-black font-bold"
                as="span"
              />
            </Typography>
            <Link href="/auth" className="text-[#1264A3] hover:underline">
              Change
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 mx-20">
          {/* Left Section - Create Workspace */}
          <div className="space-y-6">
            <div>
              <Typography text="Create a new Slack workspace" variant="h1" as="h1" className="font-bold">
                Create a new Slack workspace
              </Typography>
              <Typography variant="p" as="div" className="max-w-md text-md text-[#454245] mt-2" text="Slack gives your team a home — a place where they can talk and work together. To create a new workspace, click the button below."/>
            </div>

            <Button
              variant="secondary"
              size="lg"
              className="bg-[#3b1141] hover:bg-[#3b1141]/90 text-white w-md"
              type="submit"
            >
              <Typography text="Create a Workspace" variant="p" />
            </Button>

            <div className="space-y-3 max-w-md">
              <p className="text-xs leading-relaxed text-[#616061]">
                By continuing, you&lsquo;re agreeing to our{" "}
                <Link href="#" className="text-[#1264A3] hover:underline">
                  Main Services Agreement
                </Link>
                ,{" "}
                <Link href="#" className="text-[#1264A3] hover:underline">
                  User Terms of Service
                </Link>
                , and{" "}
                <Link href="#" className="text-[#1264A3] hover:underline">
                  Slack Supplemental Terms
                </Link>
                . Additional disclosures are available in our{" "}
                <Link href="#" className="text-[#1264A3] hover:underline">
                  Privacy Policy
                </Link>{" "}
                and{" "}
                <Link href="#" className="text-[#1264A3] hover:underline">
                  Cookie Policy
                </Link>
                .
              </p>
            </div>
          </div>

          {/* Right Section - Illustrations */}
          <div className="relative hidden lg:flex lg:items-center lg:justify-center">
            <div className="relative h-[400px] w-full">
              {/* Illustration placeholders - you can replace with actual images */}
              <div className="absolute right-0 top-0 h-40 w-40 rounded-lg bg-linear-to-br from-purple-400 to-pink-400 shadow-lg"></div>
              <div className="absolute bottom-0 right-20 h-32 w-32 rounded-lg bg-linear-to-br from-green-400 to-blue-400 shadow-lg"></div>
              <div className="absolute left-0 top-20 h-48 w-48 rounded-lg bg-linear-to-br from-orange-400 to-red-400 shadow-lg"></div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="my-16 flex items-center">
          <div className="flex-1 border-t border-[#DDDDDD]"></div>
          <span className="px-4 text-sm font-semibold text-[#616061]">OR</span>
          <div className="flex-1 border-t border-[#DDDDDD]"></div>
        </div>

        {/* Open Workspace Section */}
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 text-center">
            <h2 className="mb-2 text-2xl font-semibold text-[#1D1C1D]">
              Open a workspace
            </h2>
            <p className="text-base text-[#454245]">Ready to launch</p>
            <p className="text-base font-medium text-[#1D1C1D]">
              kingkiu1304@gmail.com
            </p>
          </div>

          {/* Workspace List */}
          <div className="mb-6 overflow-hidden rounded bg-white shadow-sm">
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                className="flex w-full items-center gap-4 border-b border-[#DDDDDD] px-6 py-4 text-left transition-colors hover:bg-gray-50 last:border-b-0"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded bg-[#363636] text-sm font-bold text-white">
                  {workspace.initials}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-[#1D1C1D]">
                    {workspace.name}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[#616061]">
                    <svg
                      className="h-3 w-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                    <span>
                      {workspace.members}{" "}
                      {workspace.members === 1 ? "member" : "members"}
                    </span>
                  </div>
                </div>
                <IoIosArrowForward className="h-5 w-5 text-[#616061]" />
              </button>
            ))}

            <button className="w-full px-6 py-3 text-left text-sm hover:underline text-black cursor-pointer">
              Show 2 more workspaces ▼
            </button>
          </div>

          {/* Try Different Email */}
          <div className="flex items-center justify-between rounded bg-[#efefef] px-6 py-2">
            <div className="flex items-center gap-2 text-sm text-[#616061]">
              <FiSearch className="h-4 w-4" />
              <span>Not seeing your workspace?</span>
            </div>
            <Link href="/auth" className="rounded border border-[#DDDDDD] bg-white px-4 py-2 text-sm font-semibold text-[#1D1C1D] transition-colors hover:bg-gray-50">
              Try a Different Email
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
