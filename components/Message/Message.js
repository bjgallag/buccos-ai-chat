import { useUser } from "@auth0/nextjs-auth0/client";
import { faRobot } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Image from "next/image";
import ReactMarkdown from "react-markdown";

export const Message = ({ role, content }) => {
  const { user } = useUser();
  return (
    <div
      className={`grid grid-cols-[30px_1fr] gap-5 p-5 ${
        role === "assistant" ? "bg-gray-600" : role === "notice" ? 'bg-red-600' : ""
      }`}
    >
      <div>
        {role == "user" && !!user ? (
          <Image
            src={user.picture}
            width={30}
            height={30}
            alt="User Avatar"
            className="rounded-sm shadow-md shadow-black/50"
          />
        ) : (
          <div className="flex h-[30px] w-[30px] items-center justify-center rounded-sm bg-gray-800 shadow-md shadow-black/50">
            <FontAwesomeIcon icon={faRobot} className="text-yellow-400" />
          </div>
        )}
      </div>
      {/** using tailwind CSS typography package's prose class to render markdown more effectively */}
      <div className="prose prose-invert">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
};
