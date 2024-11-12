import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./Home.css";

import Chat from "../../components/Chat/Chat";
import SideBar from "../../components/SideBar/SideBar";
import MermaidChart from "../../components/Mermaid/mermaid";

import { projectOneInfo } from "../../services/projects";
import { review, terraInfo } from "../../services/terraforms";

import { setReviewReady, setHasSecret } from "../../store/loadingSlice";
import { clearFinishData } from "../../store/finishDataSlice";
import { useAppDispatch, useAppSelector } from "../../store/hooks";

import Lottie from "lottie-react";
import Arrow from "./Arrow.json";
import { setData } from "../../store/dataSlice";

interface Project {
  PID: number;
  CID: number;
  UID: number;
  ARCTID: number;
  projectName: string;
  createdDate: string;
  services: {
    id: number;
    name: string;
    status: string;
    price: number;
  }[];
  previousChats: string[];
  isDeployed: boolean;
}

const Home: React.FC = () => {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const { pid } = useParams<{ pid: string }>();
  const [initialKey, setInitialKey] = useState(0);

  const token = localStorage.getItem("token");

  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const finishData = useAppSelector((state) => state.finishData.finishData);

  const isActive = useAppSelector((state) => state.button.isActive);
  //home 페이지면 무조건 키가 있어야 함.
  dispatch(setHasSecret(true));

  useEffect(() => {
    const fetchProjectData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (token) {
          const response = await projectOneInfo(Number(pid), token);
          setProject(response.data);
          if (response.data.isDeployed === true) {
            navigate("/profile");
          }
        } else {
          console.error("토큰이 없습니다. 인증 문제가 발생할 수 있습니다.");
        }
      } catch (error) {
        console.error("프로젝트 정보를 가져오는 중 오류 발생:", error);
      } finally {
        setLoading(false);
      }
    };
    dispatch(clearFinishData());
    fetchProjectData();
  }, [pid, navigate, dispatch]);

  useEffect(() => {
    if (!loading && !project) {
      navigate("/profile");
    }
  }, [loading, project, navigate]);

  useEffect(() => {
    // 컴포넌트가 처음 마운트될 때 key를 업데이트하여 MermaidChart 리렌더링
    setInitialKey((prevKey) => prevKey + 1);
  }, [pid]);

  const handleFinish = async () => {
    const cid = project?.CID || 0;
    try {
      dispatch(setReviewReady(false));
      review(cid, Number(pid), token).then(async ({ message, bool }) => {
        dispatch(setReviewReady(true));

        if (!bool) {
          alert(message);
          navigate(`/home/${pid}`);
        } else {
          // review 성공 시 terraInfo 호출
          const data = await terraInfo(cid, token);
          dispatch(setData(data));
        }
      });
      navigate(`/review/${pid}/${cid}`);
    } catch (error) {
      console.error("review API 호출 실패:", error);
      alert(
        "Terraform 상태 업데이트에 실패했습니다. 네트워크 연결을 확인하거나, 잠시 후 다시 시도해 주세요."
      );
      navigate(`/home/${pid}`);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="home">
      <Chat projectCID={project!.CID} />
      <div className="vertical-line"></div>
      <div className="right-side">
        <div className="project-name-container">
          <div className="project-name-label">Project</div>
          <div className="home-project-name">{project!.projectName}</div>
        </div>
        <MermaidChart key={initialKey} chartCode={finishData}></MermaidChart>
        <div className="review-btn-container">
          {isActive && (
            <Lottie
              className="review-btn-arrow-th"
              animationData={Arrow}
              style={{ width: "80px" }}
            ></Lottie>
          )}
          <button
            onClick={handleFinish}
            className={`review-btn-${!isActive ? "disabled" : "enabled"}`}
            disabled={!isActive}
          >
            Review
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;
