import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import "./NavBar.css";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faCloud,
  faRightFromBracket,
} from "@fortawesome/free-solid-svg-icons";
import { create } from "../../services/projects";

interface NavbarProps {
  onProjectSubmit: (name: string) => void;
}

const NavBar: React.FC<NavbarProps> = ({ onProjectSubmit }) => {
  const [isModalOpen, setIsModalOpen] = useState(false); // 모달 상태
  const navigate = useNavigate(); // useNavigate 훅 사용
  const location = useLocation(); // 현재 경로를 확인하는 훅

  const handleBackClick = () => {
    navigate(-1); // 이전 페이지로 이동
  };
  // 스크롤바 너비 계산 함수
  const getScrollbarWidth = () => {
    return window.innerWidth - document.documentElement.clientWidth;
  };
  // 모달이 열리면 body에 overflow: hidden 적용, 모달이 닫히면 제거
  useEffect(() => {
    if (isModalOpen) {
      const scrollbarWidth = getScrollbarWidth();
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = `${scrollbarWidth}px`; // 스크롤바 너비만큼 패딩 추가
      // navbar 요소가 존재하는지 확인한 후 패딩 적용
      const navbar = document.querySelector(".navbar") as HTMLElement;
      if (navbar) {
        navbar.style.paddingRight = `${scrollbarWidth}px`;
      }
    } else {
      document.body.style.overflow = "unset";
      document.body.style.paddingRight = "unset"; // 패딩 제거
      const navbar = document.querySelector(".navbar") as HTMLElement;
      if (navbar) {
        navbar.style.paddingRight = "unset"; // navbar 패딩 제거
      }
    }

    // cleanup when component unmounts
    return () => {
      document.body.style.overflow = "unset";
      document.body.style.paddingRight = "unset";
      const navbar = document.querySelector(".navbar") as HTMLElement;
      if (navbar) {
        navbar.style.paddingRight = "unset";
      }
    };
  }, [isModalOpen]);

  // 모달 열고 닫는 함수
  const handleNewProjectClick = () => {
    setIsModalOpen(!isModalOpen);
  };

  const handleProjectSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    const projectName = (event.target as HTMLFormElement).projectName.value;
    console.log("New Project Name:", projectName);

    // 부모 컴포넌트로 projectName 전달
    onProjectSubmit(projectName);
    //prohectName을 DB에 넘김
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("토큰이 존재하지 않습니다.");
      }
      await create(projectName, token); // token이 string임을 보장
    } catch (error) {
      console.log(error);
    }

    setIsModalOpen(false); // 제출 후 모달을 닫기

    navigate("/home");
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-left">
          <FontAwesomeIcon
            icon={faArrowLeft}
            size="2xl"
            className="back-button"
            onClick={handleBackClick}
          />
          <button className="new-project-btn" onClick={handleNewProjectClick}>
            + New Project
          </button>
        </div>
        <div className="navbar-center">
          <FontAwesomeIcon icon={faCloud} size="2xl" className="navbar-icon" />
          <Link to="/home" className="navbar-logo">
            Kloudify
          </Link>
        </div>
        <div className="navbar-right">
          <Link to="/profile" className="profile-button">
            안녕하세요,OO님
          </Link>
          <Link to="/login" className="profile-button">
            <FontAwesomeIcon
              icon={faRightFromBracket}
              className="logout-button"
              size="2xl"
            />
          </Link>
        </div>
      </nav>
      {isModalOpen &&
        ReactDOM.createPortal(
          <div className="new-project-modal">
            <div className="modal-content">
              <h2>Create New Project</h2>
              <form onSubmit={handleProjectSubmit}>
                <label htmlFor="projectName">Project Name:</label>
                <input
                  type="text"
                  id="projectName"
                  name="projectName"
                  required
                />
                <div className="modal-actions">
                  <button type="submit" className="submit-btn">
                    Create
                  </button>
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={handleNewProjectClick}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body // 모달을 body 아래에 렌더링
        )}
    </>
  );
};

export default NavBar;
