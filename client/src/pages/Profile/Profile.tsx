import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { setHasSecret } from "../../store/loadingSlice";
import "./Profile.css";
import {
  projectResumeInfo,
  projectDeployedInfo,
  deleteProject,
} from "../../services/projects";
import { deleteSecret, checkSecret } from "../../services/secrets";
import { info } from "../../services/users";
import { Icon } from "@iconify/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashCan, faPenToSquare } from "@fortawesome/free-regular-svg-icons";
import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { destroy } from "../../services/terraforms";
import Lottie from "lottie-react";
import Loadinganimation from "./LoadingDestroy.json";
import showAlert from "../../utils/showAlert";
// 유저 프로필 타입 정의
interface UserProfile {
  UID: number;
  username: string;
  password: string;
  email: string;
}

// 프로젝트 타입 정의
interface Project {
  PID: number;
  CID: number;
  UID: number;
  ARCTID: number;
  projectName: string;
  createdDate: string;
  isDeployed: boolean;
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const hasSecret = useAppSelector((state) => state.loading.hasSecret); // Redux에서 가져옴

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [modalType, setModalType] = useState<string>(""); // 모달 타입을 구분하는 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [filterType, setFilterType] = useState("all"); // 필터링 타입 상태 추가
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); // 드롭다운 상태 추가
  const [isDeleting, setIsDeleting] = useState<boolean>(false); // 삭제 작업 상태 추가
  const itemsPerPage = 5; // 한 페이지에 보여줄 항목 수

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userData = await info();
        setUserProfile(userData.user);
        // 유저 정보 가져오기
        const result = await checkSecret(userData.user.email);
        dispatch(setHasSecret(result));
        // 유저의 프로젝트 리스트 가져오기
        const projectResumeData = await projectResumeInfo(userData.user.email);
        const projecDeployedtData = await projectDeployedInfo(userData.user.email);
        const combinedProjects = [
          ...projectResumeData.data,
          ...projecDeployedtData.data,
        ];
        setProjects(combinedProjects); // 응답 데이터에 따라 수정 필요
      } catch (error) {
      }
    };

    fetchData();
  }, [navigate]);

  // 페이지가 변경될 때 currentPage를 조정하는 useEffect 추가
  useEffect(() => {
    // 현재 페이지가 총 페이지 수보다 클 경우, 총 페이지 수에 맞춰 currentPage 수정
    const totalPages = Math.ceil(filteredProjects().length / itemsPerPage);
    if (currentPage > totalPages) {
      setCurrentPage(totalPages > 0 ? totalPages : 1);
    }
  }, [projects, currentPage, itemsPerPage, filterType]);

  // 필터링된 프로젝트 목록 반환
  const filteredProjects = () => {
    if (filterType === "deployed") {
      return projects.filter((project) => project.isDeployed);
    } else if (filterType === "inProgress") {
      return projects.filter((project) => !project.isDeployed);
    } else {
      return projects;
    }
  };
  // 페이지에 맞춰서 보여줄 프로젝트 목록 계산
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;

  const sortedProjects = filteredProjects().sort((a, b) => {
    const dateA = new Date(a.createdDate || 0).getTime(); // createdDate가 없을 경우 1970년 1월 1일로 기본 설정
    const dateB = new Date(b.createdDate || 0).getTime(); // createdDate가 없을 경우 1970년 1월 1일로 기본 설정
    return dateB - dateA; // 최신순 정렬 (타임스탬프 기반 비교)
  });

  const currentProjects = sortedProjects.slice(
    indexOfFirstItem,
    indexOfLastItem
  );

  // 빈 행을 추가해 5개의 행을 유지
  //현재 보여줄 프로젝트가 없는 경우 게시물이 없습니다 문구 제외 빈 행이 4개가 되게
  const emptyRows =
    currentProjects.length === 0
      ? itemsPerPage - 1
      : itemsPerPage - currentProjects.length; // 남은 빈 행의 개수 계산

  // 총 페이지 수 계산
  const totalPages = Math.ceil(filteredProjects().length / itemsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  if (!userProfile) return <div>Loading...</div>;

  const handleProjectClick = (PID: number, isDeployed: boolean) => {
    if (isDeployed) {
      navigate(`/detail/${PID}`);
    } else {
      navigate(`/home/${PID}`);
    }
  };
  const handleDeleteClick = (project: Project) => {
    setProjectToDelete(project); // project 객체 전체를 설정
    setModalType("deleteProject"); // 모달 타입 설정
    setShowDeleteModal(true); // 모달 띄우기
  };

  const handleAWSKeyDeleteClick = () => {
    setModalType("deleteAWSKey"); // 모달 타입 설정
    setShowDeleteModal(true); // 모달 띄우기
  };

  const handleAWSKeySubmitClick = () => {
    navigate("/guide");
  };

  const handleConfirmDelete = async () => {

    try {
      setShowDeleteModal(false);
      setIsDeleting(true); // 삭제 작업 시작 전 로딩 상태로 설정
      if (modalType === "deleteProject" && projectToDelete) {
        // 프로젝트 삭제 로직
        await destroy(projectToDelete.CID, userProfile.email);
        await deleteProject(projectToDelete.PID, userProfile.email);

        setProjects(projects.filter((p) => p.PID !== projectToDelete.PID));
      } else if (modalType === "deleteAWSKey") {
        // AWS Key 삭제 로직
        const response = await deleteSecret(userProfile.email);
        showAlert(
          "삭제 완료",
          "프로젝트가 성공적으로 삭제되었습니다.",
          "success"
        );
        dispatch(setHasSecret(false));
      }
    } catch (error) {
      setModalType("error"); // 모달 타입 설정
    }
    setIsDeleting(false); // 삭제 작업 완료 후 로딩 상태 해제
    setProjectToDelete(null); // 초기화
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setProjectToDelete(null); // 모달 닫기
  };

  const handleFilterChange = (type: string) => {
    setFilterType(type);
    setIsDropdownOpen(false); // 드롭다운 닫기
    setCurrentPage(1); // 필터 변경 시 첫 페이지로 돌아가기
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };
  return (
    <div className="profile-page">
      {/* 상단 프로필 섹션 */}
      <div className="profile-info">
        <div className="profile-left">
          <img
            src="https://www.shareicon.net/data/512x512/2016/08/05/806962_user_512x512.png"
            className="profile-photo"
          />
          <div className="profile-text">
            <h2>{userProfile.username}</h2>
            <p>{userProfile.email}</p>
          </div>
        </div>

        {hasSecret ? (
          <div className="product-card">
            <Icon className="product-icon" icon="entypo:pin" width="20px" />
            <div className="product-title">AWS Credentials</div>
            <div className="product-actions">
              <button className="edit-button" onClick={handleAWSKeySubmitClick}>
                <FontAwesomeIcon icon={faPenToSquare} /> Edit
              </button>
              <button
                className="delete-button"
                onClick={handleAWSKeyDeleteClick}
              >
                <FontAwesomeIcon icon={faTrashCan} /> Delete
              </button>
            </div>
          </div>
        ) : (
          <button
            className="AWS-Credential-btn create"
            onClick={(e) => {
              handleAWSKeySubmitClick();
            }}
          >
            AWS key 입력
          </button>
        )}
      </div>
      <hr className="userProfile-line-th" />
      {/* 하단 프로젝트 리스트 섹션 */}
      <div className="project-list-container">
        <table className="project-list-table">
          <thead>
            <tr>
              <th className="project-name">Project Name</th>
              <th className="status">&nbsp;&nbsp;Status</th>
              <th className="created-date">Date</th>
              {/* 필터링 드롭다운 버튼 섹션 */}
              <th className="filter-dropdown">
                <button className="dropdown-button" onClick={toggleDropdown}>
                  {filterType === "all"
                    ? "All"
                    : filterType === "deployed"
                      ? "완료"
                      : "진행중"}{" "}
                  &nbsp;
                  <FontAwesomeIcon icon={faChevronDown} />
                </button>
                {isDropdownOpen && (
                  <div className="dropdown-menu">
                    <div
                      className="dropdown-item"
                      onClick={() => handleFilterChange("all")}
                    >
                      모두 보기
                    </div>
                    <div
                      className="dropdown-item"
                      onClick={() => handleFilterChange("deployed")}
                    >
                      Deploy 완료
                    </div>
                    <div
                      className="dropdown-item"
                      onClick={() => handleFilterChange("inProgress")}
                    >
                      Deploy 진행중
                    </div>
                  </div>
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {currentProjects.length > 0 ? (
              currentProjects.map((project) => (
                <tr
                  key={project.PID}
                  onClick={() =>
                    handleProjectClick(project.PID, project.isDeployed)
                  }
                >
                  <td>{project.projectName}</td>
                  <td className="status">
                    <div
                      className={`status-common ${project.isDeployed ? "completed" : "in-progress"
                        }`}
                    >
                      {project.isDeployed ? "완료" : "진행중"}
                    </div>
                  </td>
                  <td>{new Date(project.createdDate).toLocaleDateString()}</td>
                  <td className="button-cell">
                    <button
                      className="deleteButton"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(project);
                      }}
                    >
                      <FontAwesomeIcon
                        icon={faTrashCan}
                        size="xl"
                        className="svg"
                      />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} style={{ textAlign: "center" }}>
                  아직 게시물이 없습니다
                </td>
              </tr>
            )}
            {/* 빈 행을 추가하여 항상 5개의 행이 유지되도록 */}
            {Array.from({ length: emptyRows }, (_, index) => (
              <tr key={`empty-${index}`} className="empty-row">
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pagination">
          <button
            className="prev-btn"
            onClick={handlePrevPage}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <div className="page-numbers">
            {/* 현재 페이지를 표시 */}
            {Array.from({ length: totalPages }, (_, i) => (
              <span
                key={i + 1}
                className={`page-number ${currentPage === i + 1 ? "active" : ""
                  }`}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </span>
            ))}
          </div>
          <button
            className="next-btn"
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>
      {/* 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="delete-modal">
          <div className="delete-modal-content">
            {modalType === "deleteAWSKey" && (
              <>
                <h3>AWS Key를 정말 삭제하시겠습니까?</h3>
              </>
            )}
            {modalType === "deleteProject" && (
              <>
                <h3>경고: 모든 AWS 리소스 종료 작업</h3>
                <p>
                  이 버튼을 클릭하면 현재 계정 내 모든 AWS 서비스와 리소스가
                  영구적으로 종료됩니다.
                </p>
                <p>
                  이로 인해 서비스 중단, 데이터 손실, 복구 불가능한 결과가
                  발생할 수 있습니다.
                </p>
                <p>이 작업을 수행하시겠습니까?</p>
                <h4>⚠️ 한 번 더 확인해주세요. 이 작업은 취소할 수 없습니다.</h4>
              </>
            )}
            {modalType === "error" && (
              <>
                <p>요청하신 작업 중 오류가 발생했습니다.</p>
                <p>잠시뒤 다시 시작해주세요.</p>
              </>
            )}
            <div className="delete-modal-buttons">
              {(modalType === "deleteProject" ||
                modalType === "deleteAWSKey") && (
                  <>
                    <button
                      className="delete-cancel-button"
                      onClick={handleCancelDelete}
                    >
                      취소
                    </button>
                    <button
                      className="delete-confirm-button"
                      onClick={handleConfirmDelete}
                    >
                      삭제
                    </button>
                  </>
                )}
              {modalType === "error" && (
                <>
                  <button
                    className="delete-cancel-button-th"
                    onClick={handleCancelDelete}
                  >
                    확인
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 삭제 작업 중일 때 오버레이 표시 */}
      {isDeleting && (
        <div className="profile-loading-th">
          <Lottie
            animationData={Loadinganimation}
            style={{ width: "300px", height: "300px" }}
          />
          <h3>삭제중입니다...</h3>
        </div>
      )}
    </div>
  );
};

export default Profile;
