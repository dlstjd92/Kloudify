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
        let lastEvaluatedKey: AWS.DynamoDB.Key | undefined = undefined; // null 대신 undefined 사용
        let maxID = 0;
    
        do {
            const params = {
                TableName: 'Conversations',
                ProjectionExpression: 'ID', // ID 값만 가져옴
                ExclusiveStartKey: lastEvaluatedKey, // 페이지네이션을 위해 마지막 키 설정
            };
    
            try {
                const result = await this.dynamoDB.scan(params).promise();
                if (result.Items && result.Items.length > 0) {
                    // 각 페이지에서 최대 ID 찾기
                    result.Items.forEach(item => {
                        if (item.ID > maxID) {
                            maxID = item.ID; // 가장 큰 ID를 찾음
                        }
                    });
                }
                // 다음 페이지가 있으면 lastEvaluatedKey 설정
                lastEvaluatedKey = result.LastEvaluatedKey;
            } catch (error) {
                console.error('마지막 ID 조회 실패:', error.message);
                throw new Error('마지막 ID 조회 실패');
            }
        } while (lastEvaluatedKey); // 마지막 페이지까지 탐색
    
        return maxID; // 최종적으로 가장 큰 ID 반환
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
                + "대화를 주도하며 필요한 경우 추가 질문을 통해 사용자의 요구사항을 명확히 하세요. "
                + "답변에서 사용자가 특정 aws의 서비스를 단순히 언급하는게 아닌 '확실하게 사용하겠다고 확정 {ex)ec2를 사용할께 같은 경우}' 지은 경우에만 대답을 완료한 후 별도로 추출하기 쉽도록 텍스트 하단에 "
                + `**[ { "service": "ec2", "options": { "ami": "ami-02c329a4b4aba6a48", "instance_type": "t2.micro", "public": true, "subnet_id": "subnet-0189db2034ce49d30" } } ] 
                이런 포맷으로 서비스 종류 하나씩 출력하세요. 이스케이프 코드 넣지 마 앞에 **을 꼭 넣어줘`
                ;
                
            case 2:
                return "아웃풋 텍스트 제일 뒤에 **나와라제발 을 추가해줘";
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

    async askBedrockModel(user_question: string, CID: number): Promise<any> {
        console.log(`CID received in askBedrockModel: ${CID}`);
    
        // 특정 입력에 대한 템플릿 응답 설정
        const templateResponses = {
            //         인풋 : 아웃풋
            // level 1
            '간단한 웹사이트': 'templete1-5',
            '간단한 게임': '이것은 템플릿 응답입니다. 질문 2에 대한 준비된 답변입니다.',
            '데이터저장': '이것은 템플릿 응답입니다. 질문 2에 대한 준비된 답변입니다.',
            '서버 운영': '이것은 템플릿 응답입니다. 질문 2에 대한 준비된 답변입니다.',
            '개발 환경 제공': '이것은 템플릿 응답입니다. 질문 2에 대한 준비된 답변입니다.',
            '예상 사용자 수 - X명': '이것은 템플릿 응답입니다. 질문 2에 대한 준비된 답변입니다.',
            '그외 기타 사항 - XXX': '이것은 템플릿 응답입니다. 질문 2에 대한 준비된 답변입니다.',
            '퍼블릭 통신 유무': '이것은 템플릿 응답입니다. 질문 2에 대한 준비된 답변입니다.',

            // level 2
            '서버가 핵심': '이것은 템플릿 응답입니다. 질문 2에 대한 준비된 답변입니다.',
            '간단한 웹서버': '이것은 템플릿 응답입니다. 질문 2에 대한 준비된 답변입니다.',
            '데이터 저장 공간이 필요함 - xxx 유형의 데이터가 주로 저장': '이것은 템플릿 응답입니다. 질문 2에 대한 준비된 답변입니다.',
            '스토리지 필요여부 - xxx': '이것은 템플릿 응답입니다. 질문 2에 대한 준비된 답변입니다.',
            '네트워크 구성 - xxx': '이것은 템플릿 응답입니다. 질문 2에 대한 준비된 답변입니다.',
            '그 외 필요한 기능': '이것은 템플릿 응답입니다. 질문 2에 대한 준비된 답변입니다.',

            // level 3
            '1': '이것은 템플릿 응답입니다. 질문 2에 대한 준비된 답변입니다.',
            '2': '이것은 템플릿 응답입니다. 질문 2에 대한 준비된 답변입니다.',
            '3': '이것은 템플릿 응답입니다. 질문 2에 대한 준비된 답변입니다.',
            '4': '이것은 템플릿 응답입니다. 질문 2에 대한 준비된 답변입니다.',
            '5': '이것은 템플릿 응답입니다. 질문 2에 대한 준비된 답변입니다.',

            // level 4
            '6': '이것은 템플릿 응답입니다. 질문 2에 대한 준비된 답변입니다.',

        };
    
        // 특정 질문이 들어오면 템플릿 응답 제공
        if (templateResponses[user_question]) {
            const templateResponse = templateResponses[user_question];
    
            // 대화 내용을 DynamoDB에 저장
            await this.saveConversation(CID, user_question, templateResponse);
    
            // 템플릿 응답을 JSON 형식으로 반환
            return {
                "id": "-",
                "type": "message",
                "role": "assistant",
                "model": "-",
                "content": [
                    {
                        "type": "text",
                        "text": templateResponse
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

        // const requestBody = {
        //     input_text: prompt_content,  // 요청할 프롬프트 내용을 prompt_content로 지정
        //     parameters: {
        //         max_tokens: 1000,       // 생성할 최대 토큰 수
        //         temperature: 0.7,       // 창의성 정도 조정
        //         top_p: 0.9,             // 확률 분포 기반 선택 기준
        //         stop_sequences: ["\n"]  // 응답을 멈추게 할 시퀀스 설정
        //     },
        // };
        
    
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
                ID: newID,  // ID는 마지막 값 + 1
                CID, // 새로운 CID 사용
                userMessage,
                botResponse,
                timestamp: new Date().toISOString(),  // 현재 시간을 timestamp로 저장
            }
        };
    
        try {
            console.log('DynamoDB에 저장할 데이터:', params); // 디버깅을 위한 로그
            await this.dynamoDB.put(params).promise();
            console.log('대화 기록이 성공적으로 저장되었습니다.');
        } catch (error) {
            console.error('대화 기록 저장 실패:', error.message);
            console.error('DynamoDB 요청 실패 params:', params); // 추가 디버깅 로그
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

        try {
            console.log('쿼리 파라미터:', params);
            const result = await this.dynamoDB.scan(params).promise(); // scan을 사용하여 CID 필터링

            if (!result.Items) {
                return [];  // 항목이 없으면 빈 배열 반환
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
            return { keywords: [], updatedText: text };  // null 또는 빈 문자열 처리
        }
    
        // **로 시작하고 개행(\n) 또는 텍스트 끝까지 추출
        const regex = /\*\*(.*?)(\n|$)/g;
        const matches: string[] = [];
        let updatedText = text;  // 원본 텍스트 복사
    
        let match;
        // 정규식을 통해 키워드 추출과 동시에 텍스트에서 해당 부분 제거
        while ((match = regex.exec(text)) !== null) {
            matches.push(match[1].trim());  // 키워드 추출
            updatedText = updatedText.replace(match[0], '');  // 추출한 부분 텍스트에서 제거
        }
    
        return { keywords: matches, updatedText: updatedText.trim() };  // 키워드와 수정된 텍스트 반환
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
                CID: CID,  // CID를 파티션 키로 사용
                keyword: combinedKeywords,  // 기존 키워드와 새 키워드를 결합한 문자열 저장
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
        const { keywords, updatedText } = result;  // 객체에서 키워드와 업데이트된 텍스트 분리
    
        if (keywords.length > 0) {
            // ConversationsService.incrementModelCounter(); // 여기서 1증가시켜서 컨텍스트 스위칭 일어남
            await this.saveKeywords(keywords, CID);  // 키워드 저장
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
            TableName: 'Archboard_keyword',  // 원하는 테이블 이름
            KeyConditionExpression: 'CID = :cid',  // CID에 대해 쿼리
            ExpressionAttributeValues: { ':cid': CID }
        };
    
        const result = await this.dynamoDB.query(params).promise();
        if (!result.Items || result.Items.length === 0) {
            return [];  // 키워드가 없을 경우 빈 배열 반환
        }
    
        return result.Items.map(item => item.keyword);  // 키워드 배열 반환
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
        return result.Item ? result.Item.keyword : null;  // 기존 키워드 반환, 없으면 null
    }

        // CID에 따라 Archboard_keyword 테이블에서 키워드 가져오기
    async getKeywordsByCID(CID: number): Promise<string[]> {
        const params = {
        TableName: 'Archboard_keyword',
        KeyConditionExpression: 'CID = :cid',
        ExpressionAttributeValues: {
            ':cid': CID,
        },
        };

        try {
        const result = await this.dynamoDbDocClient.send(new QueryCommand(params));
        const keywords = result.Items?.map(item => item.keyword) ?? []; // 키워드 필드 추출
        return keywords;
        } catch (error) {
        console.error(`Failed to fetch keywords for CID ${CID}:`, error);
        throw new Error('Error retrieving keywords');
        }
    }
}
