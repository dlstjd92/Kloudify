import { Injectable } from '@nestjs/common';
import * as AWS from 'aws-sdk';
import * as dotenv from 'dotenv';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

dotenv.config();

@Injectable()
export class ConversationsService {
    private dynamoDB: AWS.DynamoDB.DocumentClient;
    private dynamoDbDocClient: DynamoDBDocumentClient;

    static modelSwitchCounter = 1;

    constructor() {
        this.dynamoDB = new AWS.DynamoDB.DocumentClient({
            region: process.env.AWS_REGION,
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        });
    }

    // 전역 변수를 1씩 증가시키는 함수
    static incrementModelCounter(): void {
        ConversationsService.modelSwitchCounter++;
    }

    // ID 증가를 위해 테이블의 가장 큰 ID를 조회하는 함수
    async getLastID(): Promise<number> {
        let lastEvaluatedKey: AWS.DynamoDB.Key | undefined = undefined;
        let maxID = 0;

        do {
            const params = {
                TableName: 'Conversations',
                ProjectionExpression: 'ID',
                ExclusiveStartKey: lastEvaluatedKey,
            };

            try {
                const result = await this.dynamoDB.scan(params).promise();
                if (result.Items && result.Items.length > 0) {
                    result.Items.forEach(item => {
                        if (item.ID > maxID) {
                            maxID = item.ID;
                        }
                    });
                }
                lastEvaluatedKey = result.LastEvaluatedKey;
            } catch (error) {
                console.error('마지막 ID 조회 실패:', error.message);
                throw new Error('마지막 ID 조회 실패');
            }
        } while (lastEvaluatedKey);

        return maxID;
    }

    // 전역 변수에 따라 다른 프롬프트 메시지를 생성하는 함수
    getCustomMessage(): string {
        switch (ConversationsService.modelSwitchCounter % 4) {
            case 0:
                return "당신은 사용자의 요구에 맞는 AWS 서비스 아키텍처를 단계별로 구성하는 안내자 역할을 합니다. "
                    + "대화를 주도하며 필요한 경우 추가 질문을 통해 사용자의 요구사항을 명확히 하세요. "
                    + "질문에 대해 뭔가 만들고싶다고 요청할 시 필요한 서비스를 목록화 해서 짧게 대답해줘. 문장을 완성하지말고 키워드만 언급하면서"
                    + "예시) [짧은 설명 텍스트] \n 1. EC2 - [인스턴스 이름 ex)t2.micro] : [선정한 이유] \n"
                    + "예시 텍스트에서 [짧은 설명 텍스트]에는 짧게 전체적인 설명을 해주고 [선정한 이유]에는 해당 인스턴스에 대한 짧은 설명 부탁해. 중괄호는 출력하지 않아도 돼"
                    + "만약 사용자가 특정 서비스를 선택하는 메세지를 전송 시 긍정해주는 메세지를 보내줘.";
            case 1:
                return "당신은 사용자의 요구에 맞는 AWS 서비스 아키텍처를 단계별로 구성하는 안내자 역할을 합니다."
                    + "대화를 주도하며 필요한 경우 추가 질문을 통해 사용자의 요구사항을 명확히 하세요."
                    + "답변에서 사용자가 특정 aws의 서비스를 단순히 언급하는게 아닌 '확실하게 사용하겠다고 확정 {ex)ec2를 사용할께 같은 경우}' 지은 경우에만 대답을 완료한 후 별도로 추출하기 쉽도록 텍스트 하단에 "
                    + `**[ { "service": "", "options": { "ami": "", "instance_type": "", "public": ""} } ]
                    이런 포맷으로 서비스 종류 하나씩 출력하세요. \\n 없이 한줄로 출력해줘. 앞에 **을 꼭 넣어줘`
                    + "혹시 사용자가 aws와 관련없는 주제로 대답할 경우 aws 선택을 할 수 있도록 주제를 상기시켜줘"
                    + "aws 기본 지역은 서울 지역이야."
                    + "ec2의 ami와 subnet_id도 내가 구성한 내용을 바탕으로 실제로 사용할 수 있도록 구성해줘. subnet은 별도의 언급이 없다면 기본값으로 설정하고";
            case 2:
                return "당신은 사용자의 요구에 맞는 AWS 서비스 아키텍처를 단계별로 구성하는 안내자 역할을 합니다. "
                    + "대화내역을 바탕으로 사용자에게 알맞은 서비스를 추천해주세요."
                    + "이런 포맷으로 서비스 종류 하나씩 출력하세요. 이스케이프 코드 넣지 마 행렬 앞에 **을 꼭 넣어줘"
                    + '그렇게 추천해준 서비스를 [ { "service": "ec2", "options": { "ami": "ami-02c329a4b4aba6a48", "instance_type": "t2.micro", "public": true, "subnet_id": "subnet-0189db2034ce49d30" } } ] 이런 포맷으로 서비스 종류 하나씩 행렬안에 넣어주세요. 이스케이프 코드 넣지말고 앞에 **을 꼭 넣어주세요';
            case 3:
                return `{
                    "service": "ec2",
                    "options": {
                        "ami": "ami-02c329a4b4aba6a48",
                        "instance_type": "t2.micro",
                        "public": true,
                        "subnet_id": "subnet-0189db2034ce49d30"
                    }
                }`;
            default:
                return "기본 프롬프트 메시지입니다.";
        }
    }

    static async saveConversation(CID: number, user_question: string, response: string) {
        console.log(`Saving conversation: CID=${CID}, user_question=${user_question}, response=${response}`);
    }

    createResponse(text: string) {
        return {
            "id": "-",
            "type": "message",
            "role": "assistant",
            "model": "-",
            "content": [
                {
                    "type": "text",
                    "text": text
                }
            ],
            "stop_reason": "-",
            "stop_sequence": null,
            "usage": {
                "input_tokens": "-",
                "output_tokens": "-"
            }
        };
    }

    // CID별로 상태를 DynamoDB에 저장하고 관리
    async saveState(CID: number, stateData: string[]): Promise<void> {
        const params = {
            TableName: 'ConversationsState',
            Item: {
                CID: CID,
                stateData: stateData,
                expiresAt: Math.floor(Date.now() / 1000) + 30 * 60, // 30분 후 만료
            },
        };

        try {
            await this.dynamoDB.put(params).promise();
            console.log(`CID ${CID}의 상태가 저장되었습니다.`);
        } catch (error) {
            console.error(`CID ${CID}의 상태 저장 실패:`, error);
            throw new Error('상태 저장 실패');
        }
    }

    async getState(CID: number): Promise<string[]> {
        const params = {
            TableName: 'ConversationsState',
            Key: { CID: CID },
        };

        try {
            const result = await this.dynamoDB.get(params).promise();
            if (result.Item) {
                const currentTime = Math.floor(Date.now() / 1000);
                if (result.Item.expiresAt < currentTime) {
                    // 데이터가 만료됨
                    return [];
                } else {
                    return result.Item.stateData as string[];
                }
            } else {
                return []; // 상태 데이터가 없으면 빈 배열 반환
            }
        } catch (error) {
            console.error(`CID ${CID}의 상태 조회 실패:`, error);
            throw new Error('상태 조회 실패');
        }
    }

    async deleteState(CID: number): Promise<void> {
        const params = {
            TableName: 'ConversationsState',
            Key: { CID: CID },
        };

        try {
            await this.dynamoDB.delete(params).promise();
            console.log(`CID ${CID}의 상태가 삭제되었습니다.`);
        } catch (error) {
            console.error(`CID ${CID}의 상태 삭제 실패:`, error);
            throw new Error('상태 삭제 실패');
        }
    }

    async askBedrockModel(user_question: string, CID: number): Promise<any> {
        console.log(`CID received in askBedrockModel: ${CID}`);

        // CID별 상태 조회
        let globalMatrix = await this.getState(CID);

        // 만료된 상태이거나 없으면 초기화
        if (!globalMatrix || globalMatrix.length === 0) {
            globalMatrix = [];
        }

        // 특정 입력에 대한 템플릿 응답 설정
        const templateResponses = {
            '이 프로젝트의 최종 목표는 무엇인가요': 'template1-2',
            '클라우드에서 가장 필요한 기능이나 역할은 무엇인가요': 'template1-3',
            '이 프로젝트를 이용할 예상 사용자 수는 얼마나 되나요': 'template1-4',
            '예산이나 기간 제한이 있나요': 'template1-5',
            '특별히 고려하고 싶은 요소가 있다면 알려주세요': 'template1-6',
            '당신의 서비스가 인터넷과 연결되어야 하나요': '서버',
            '다음문항': 'template3-4'
        };

        const level4Questions = {
            '디비': '데이터베이스의 주요 기준을 선택하세요',
            '서버': '서버의 주요 기준을 선택하세요',
            '스토리지': '저장 공간의 주요 기준을 선택하세요',
            '네트워크': '네트워크 구성에서 중요하게 여기는 기준을 선택하세요',
            '모니터링': '모니터링과 로그 관리의 주요 기준을 선택하세요',
        };

        // 템플릿 키를 확인하고 응답 생성
        const templateKey = Object.keys(templateResponses).find(key => user_question.includes(key));
        let templateResponse: string = templateKey ? templateResponses[templateKey] : 'default response';
        if (templateKey) {
            const isNextQuestion = user_question.includes('다음문항');

            console.log("hi", templateResponse);
            console.log(isNextQuestion);

            if ((templateKey === '그 외에 필요한 기능이 있나요' || isNextQuestion) && globalMatrix) {
                if (globalMatrix.length === 0) {
                    await this.deleteState(CID);
                    return this.createResponse("종료");
                }
                const nextItem = globalMatrix.shift();
                if (nextItem && level4Questions[nextItem]) {
                    // 상태 저장
                    await this.saveState(CID, globalMatrix);
                    return this.createResponse(level4Questions[nextItem]);
                } else {
                    await this.deleteState(CID);
                    return this.createResponse("다음 질문이 없습니다.");
                }
            }

            // 템플릿 응답 반환
            await this.saveConversation(CID, user_question, templateResponse);
            return this.createResponse(templateResponse);
        }

        const options = [
            { keyword: '서버선택', noSelectionLog: "서버선택 안함 로직 실행", selectionLog: "서버설정", nextTem: "디비" },
            { keyword: '디비선택', noSelectionLog: "디비선택 안함 로직 실행", selectionLog: "디비설정", nextTem: "스토리지" },
            { keyword: '스토리지선택', noSelectionLog: "스토리지 선택 안함 로직 실행", selectionLog: "스토리지설정", nextTem: "네트워크" },
            { keyword: '네트워크선택', noSelectionLog: "네트워크 선택 안함 로직 실행", selectionLog: "네트워크설정", nextTem: "모니터링" },
            { keyword: '모니터링선택', noSelectionLog: "모니터링 선택 안함 로직 실행", selectionLog: "모니터링설정", nextTem: "다음문항" }
        ];

        // 조건을 반복하며 인풋 텍스트에서 확인
        for (const option of options) {
            if (user_question.includes(option.keyword)) {
                if (option.keyword === "모니터링선택") {
                    if (user_question.includes('필요없음')) {
                        console.log(option.noSelectionLog, "Is here??");
                        await this.saveConversation(CID, user_question, 'template3-3');

                        // 상태 저장 또는 삭제
                        if (globalMatrix.length === 0) {
                            await this.deleteState(CID);
                        } else {
                            await this.saveState(CID, globalMatrix);
                        }

                        console.log(`template3-3 !![${globalMatrix.join(', ')}]`);
                        return this.createResponse(`template3-3 !![${globalMatrix.join(', ')}]`);
                    }

                    if (option.selectionLog) {
                        globalMatrix.push(option.selectionLog);
                    }

                    await this.saveConversation(CID, user_question, 'template3-3');
                    await this.saveState(CID, globalMatrix);

                    console.log(`template3-3 !![${globalMatrix.join(', ')}]`);
                    return this.createResponse(`template3-3 !![${globalMatrix.join(', ')}]`);
                }
                else if (user_question.includes('필요없음')) {
                    console.log(option.noSelectionLog);

                    await this.saveConversation(CID, user_question, option.nextTem);

                    // 상태 저장 또는 삭제
                    if (globalMatrix.length === 0) {
                        await this.deleteState(CID);
                    } else {
                        await this.saveState(CID, globalMatrix);
                    }

                    console.log(`template3-3 !![${globalMatrix.join(', ')}]`);
                    return this.createResponse(`${option.nextTem} !![${globalMatrix.join(', ')}]`);
                }
                else {
                    console.log(option.selectionLog);
                    if (option.selectionLog) {
                        globalMatrix.push(option.selectionLog);
                    }

                    await this.saveConversation(CID, user_question, option.nextTem);
                    await this.saveState(CID, globalMatrix);

                    console.log(`template3-3 !![${globalMatrix.join(', ')}]`);
                    return this.createResponse(`${option.nextTem} !![${globalMatrix.join(', ')}]`);
                }
            }
        }

        // 기존 로직 이후 추가 로직
        const labels = [
            "그 외에 필요한 기능이 있나요",
            "비용 최적화: 비용을 낮추고 저용량부터 시작할 수 있는 설정 (예: 작은 RDS 인스턴스, 온디맨드 가격 모델)",
            "고성능: 높은 성능과 빠른 처리 속도를 위해 최적화된 설정 (예: 고성능 RDS 인스턴스, Provisioned IOPS 스토리지)",
            "확장 가능성: 서비스 확장을 위한 자동 확장 옵션 (예: Aurora Serverless)",
            "저비용 서버: 일반적인 웹 서비스나 소규모 트래픽을 위한 저비용 옵션 (예: 작은 EC2 인스턴스, Spot Instances)",
            "성능 중심 서버: 트래픽이 많거나 성능이 중요한 경우 (예: 고성능 EC2 인스턴스, Enhanced Networking 지원)",
            "서버리스: 관리가 필요 없는 자동 확장 서버리스 옵션 (예: AWS Lambda)",
            "비용 절감: 장기 저장 및 저렴한 비용이 필요할 때 (예: S3 Standard-IA, S3 Glacier)",
            "고성능: 빈번한 데이터 접근을 위한 높은 성능 (예: S3 Standard)",
            "확장 및 내구성: 자동 확장 및 높은 데이터 내구성을 원하는 경우 (예: S3와 자동 확장 설정)",
            "기본 보안: 기본적인 보안 구성으로 클라우드 네트워크 보호",
            "고급 보안: 보안 강화를 위한 VPN 연결 및 세분화된 접근 제어 (예: VPC, Network ACL)",
            "성능 최적화: 네트워크 성능을 높이기 위한 고성능 설정 (예: 고성능 네트워킹, 글로벌 가속기)",
            "기본 모니터링: 기본적인 성능 모니터링과 에러 알림 (예: CloudWatch 기본 설정)",
            "심화 모니터링: 더 상세한 성능 및 로그 데이터 수집 (예: CloudWatch와 고급 메트릭)",
            "자동화된 경고 및 알림: 특정 조건이 발생할 때 자동으로 알림을 받는 설정 (예: 경고 알림 및 자동 조치 설정)"
        ];

        // label 값을 확인하고 globalMatrix에서 값을 pop하는 로직
        for (const label of labels) {
            if (user_question.includes(label)) {
                const nextValue = globalMatrix.shift();

                if (nextValue) {
                    await this.saveConversation(CID, user_question, nextValue);
                    await this.saveState(CID, globalMatrix);

                    // 리스트가 비었으면 상태 삭제
                    if (globalMatrix.length === 0) {
                        await this.deleteState(CID);
                    }

                    return this.createResponse(nextValue);
                } else {
                    await this.deleteState(CID);
                    return this.createResponse("선택이 완료되었습니다.");
                }
            }
        }

        // 이 아래는 기존 Bedrock 모델 호출 로직 그대로 유지
        const client = new AWS.BedrockRuntime({
            region: process.env.AWS_REGION,
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        });

        // 기존 대화 내역 불러오기
        const previousConversations = await this.getConversationsByCID(CID);
        const conversationHistory = previousConversations
            .map((item) => `User: ${item.userMessage}\nBot: ${item.botResponse}`)
            .join('\n');

        // 전역 변수에 따라 프롬프트 메시지 변경
        const customMessage = this.getCustomMessage();

        // 프롬프트 메시지 구성
        const prompt_content = `
            대화 내역:
            ${conversationHistory}

            현재 단계:
            ${customMessage}

            새로운 질문: 
            ${user_question}
        `;

        // 요청 바디 구성
        const requestBody = {
            max_tokens: 1000,
            anthropic_version: 'bedrock-2023-05-31',
            messages: [
                {
                    role: 'user',
                    content: prompt_content,
                },
            ],
        };

        try {
            // Bedrock 모델 호출
            const response = await client
                .invokeModel({
                    body: JSON.stringify(requestBody),
                    contentType: 'application/json',
                    modelId: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
                })
                .promise();

            const responseBody = response.body.toString();
            const parsedResponse = JSON.parse(responseBody);

            // 응답에서 'content' 필드의 'text' 값을 추출하여 botResponse로 사용
            const botResponse = parsedResponse.content?.[0]?.text;

            // 키워드 처리 및 저장 (botResponse, user_question을 사용)
            const updatedResponse = await this.processTextAndAddKeywords(botResponse, user_question, CID);

            // 최종적으로 업데이트된 텍스트와 함께 리턴 (키워드 리스트 포함)
            return {
                ...parsedResponse,
                content: [
                    {
                        type: "text",
                        text: updatedResponse  // 업데이트된 텍스트 (키워드 리스트 포함)
                    }
                ]
            };
        } catch (error) {
            throw new Error(`Bedrock 모델 호출 실패: ${error.message}`);
        }
    }

    // 대화 기록을 DynamoDB에 저장하는 함수
    async saveConversation(CID: number, userMessage: string, botResponse: string): Promise<void> {
        const lastID = await this.getLastID(); // 마지막 ID 조회
        console.log(lastID);
        const newID = lastID + 1; // 마지막 ID에 1을 더해 새로운 ID 생성

        const params = {
            TableName: 'Conversations',
            Item: {
                ID: newID,
                CID,
                userMessage,
                botResponse,
                timestamp: new Date().toISOString(),
            }
        };

        try {
            console.log('DynamoDB에 저장할 데이터:', params);
            await this.dynamoDB.put(params).promise();
            console.log('대화 기록이 성공적으로 저장되었습니다.');
        } catch (error) {
            console.error('대화 기록 저장 실패:', error.message);
            console.error('DynamoDB 요청 실패 params:', params);
            throw new Error('대화 기록 저장 실패');
        }
    }

    // DynamoDB에서 특정 CID의 대화 기록을 불러오는 함수
    async getConversationsByCID(CID: number): Promise<any> {
        const params = {
            TableName: 'Conversations',
            FilterExpression: 'CID = :cid',
            ExpressionAttributeValues: {
                ':cid': CID,
            }
        };
        console.log("hi my name is CID");
        try {
            console.log('쿼리 파라미터:', params);
            const result = await this.dynamoDB.scan(params).promise();

            if (!result.Items) {
                return [];
            }

            return result.Items.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        } catch (error) {
            console.error('대화 기록 불러오기 실패:', error.message);
            throw new Error('대화 기록 불러오기 실패');
        }
    }

    // **로 감싸진 텍스트에서 키워드 추출
    extractKeywords(text: string): { keywords: string[], updatedText: string } {
        if (!text) {
            console.log("여긴 콘솔로그 안");
            return { keywords: [], updatedText: text };
        }

        const regex = /\*\*(.*?)(\n|$)/g;
        const matches: string[] = [];
        let updatedText = text;

        let match;
        while ((match = regex.exec(text)) !== null) {
            matches.push(match[1].trim());
            updatedText = updatedText.replace(match[0], '');
        }

        return { keywords: matches, updatedText: updatedText.trim() };
    }

    // 기존 키워드와 새로 추출한 키워드를 모두 누적 저장하는 함수
    async saveKeywords(keywords: string[], CID: number): Promise<void> {
        // 기존 키워드를 먼저 불러오기
        let existingKeywords = await this.fetchExistingKeywords(CID);

        // 새로운 키워드를 기존 키워드에 추가하여 문자열로 결합
        const combinedKeywords = existingKeywords ? `${existingKeywords}, ${keywords.join(', ')}` : keywords.join(', ');

        const params = {
            TableName: 'Archboard_keyword',
            Item: {
                CID: CID,
                keyword: combinedKeywords,
                timestamp: new Date().toISOString(),
            }
        };

        try {
            await this.dynamoDB.put(params).promise();
            console.log(`키워드 저장 성공: ${combinedKeywords}`);
        } catch (error) {
            console.error(`키워드 저장 실패: ${error.message}`);
        }
    }

    async processTextAndAddKeywords(outputText: string, inputText: string, CID: number): Promise<string> {
        // 키워드 추출 및 텍스트 업데이트
        const result = this.extractKeywords(outputText);
        const { keywords, updatedText } = result;

        if (keywords.length > 0) {
            // ConversationsService.incrementModelCounter(); // 여기서 1증가시켜서 컨텍스트 스위칭 일어남
            await this.saveKeywords(keywords, CID);
        }

        // CID로 저장된 키워드 조회
        const fetchedKeywords = await this.fetchKeywordsByCID(CID);

        // 최종적으로 텍스트 끝에 키워드 리스트 추가
        const finalText = updatedText + `\n**[${fetchedKeywords.join(', ')}]`;

        // 인풋(사용자 입력)과 최종 텍스트 저장
        await this.saveConversation(CID, inputText, finalText);

        return finalText;
    }

    async fetchKeywordsByCID(CID: number): Promise<string[]> {
        const params = {
            TableName: 'Archboard_keyword',
            KeyConditionExpression: 'CID = :cid',
            ExpressionAttributeValues: { ':cid': CID }
        };

        const result = await this.dynamoDB.query(params).promise();
        if (!result.Items || result.Items.length === 0) {
            return [];
        }

        return result.Items.map(item => item.keyword);
    }

    // CID로 기존에 저장된 키워드를 조회하는 함수
    async fetchExistingKeywords(CID: number): Promise<string | null> {
        const params = {
            TableName: 'Archboard_keyword',
            Key: {
                CID: CID
            }
        };

        const result = await this.dynamoDB.get(params).promise();
        return result.Item ? result.Item.keyword : null;
    }
}
