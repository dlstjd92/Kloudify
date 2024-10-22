import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Projects } from './entity/projects.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Users } from '../users/entity/users.entity'; // 유저 엔티티 연결

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Projects)
    private readonly projectRepository: Repository<Projects>,
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
  ) {}

  // 새로운 프로젝트 생성
  async create(createProjectDto, user): Promise<Projects> {
    if (!user) {
      throw new NotFoundException('User not found');
    }
    console.log("createProjectDto.projectName: ", createProjectDto.projectName);
    const project = this.projectRepository.create({
    projectName: createProjectDto.projectName,
    createdDate: new Date(),
    UID: user.UID,
    });

    return this.projectRepository.save(project);
  }


// 유저ID로 모든 프로젝트 가져오기
  async findAllByUserId(userId: number): Promise<Projects[]> {
    return this.projectRepository.find({ where: { UID: userId } });
  }


// PID로 특정 프로젝트 가져오기
  async findOneByPID(pid: number): Promise<Projects> {
    const project = await this.projectRepository.findOne({ where: { PID:pid } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    console.log("project findOne: ", pid);
    
    return project;
  }

// PID로 프로젝트 삭제
  async remove(pid: number, uid: number): Promise<void> {
    const project = await this.projectRepository.findOne({ where: { PID:pid } });
    if (!project) {
      throw new NotFoundException('There is no projectsProject not found');
    }
    console.log("Delet: ",pid);
    
    await this.projectRepository.remove(project);
  }
}
