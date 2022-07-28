package main

// import
import(
	"encoding/json"
	"fmt"
	"time"
	"log"

	"github.com/golang/protobuf/ptypes"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)
// 체인코드 구조체
type SimpleChaincode struct {
	contractapi.Contract
}
// WS LuggageCredit 구조체
type LC struct {
	ObjectType string `json:"docType"`
	CreditId string `json:"creditid"`
	Owner string `json:"owner"`
	FlightId string `json:"flight"`
	Weight int `json:"weight"`
	Price int `json:"price"`
	Status string `json: "status"`
}

type HistoryQueryResult struct {
	Record    *LC    `json:"record"`
	TxId     string    `json:"txId"`
	Timestamp time.Time `json:"timestamp"`
	IsDelete  bool      `json:"isDelete"`
}

// RegisterCredit 함수
func (t *SimpleChaincode) RegisterCredit(ctx contractapi.TransactionContextInterface, creditid string, owner string, flightid string, weight int, price int  ) error {
	fmt.Println("- start register Credit")
	
	// 기등록 크레딧 검색
	creditAsBytes, err := ctx.GetStub().GetState(creditid)
	if err != nil {
		return fmt.Errorf("Failed to get credit: " + err.Error())
	} else if creditAsBytes != nil {
		return fmt.Errorf("This credit already exists: " + creditid)
	}

	// 구조체 생성 -> 마샬링 -> PutState
	credit := &LC{"credit", creditid, owner, flightid, weight, price, "registered"}
	creditJSONasBytes, err := json.Marshal(credit)
	if err != nil {
		return err
	}
	err = ctx.GetStub().PutState(creditid, creditJSONasBytes)
	if err != nil {
		return err
	}
	return nil
}

// ReadCredit 함수
func (t *SimpleChaincode) ReadCredit(ctx contractapi.TransactionContextInterface, creditid string) (*LC, error) {
	fmt.Println("- start read credit")
	
	// 기등록 마블 검색
	creditAsBytes, err := ctx.GetStub().GetState(creditid)
	if err != nil {
		return nil, fmt.Errorf("Failed to get credit: " + err.Error())
	} else if creditAsBytes == nil {
		return nil, fmt.Errorf("This credit does not exists: " + creditid)
	}
	
	var credit LC
	err = json.Unmarshal(creditAsBytes, &credit)
	if err != nil {
		return nil, err
	}

	return &credit, nil
}

// TransferCredit 함수
func (t *SimpleChaincode) TransferCredit(ctx contractapi.TransactionContextInterface, creditid string, newOwner string ) error {
	fmt.Println("- start Transfer Credit")
	
	// 기등록 크레딧 검색
	creditAsBytes, err := ctx.GetStub().GetState(creditid)
	if err != nil {
		return fmt.Errorf("Failed to get credit: " + err.Error())
	} else if creditAsBytes == nil {
		return fmt.Errorf("This credit does not exist: " + creditid)
	}

	// 검증 해당 크레딧이 newOwner에게 transfer approve 되었나?
	// unmarshal 시키는거 먼저
	credit := LC{}
	_ = json.Unmarshal(creditAsBytes, &credit)
	// 수정 -> 오너 변경
	credit.Owner = newOwner
	credit.Status = "transfered"

	creditAsBytes, err = json.Marshal(credit)
	if err != nil {
		return err
	}
	err = ctx.GetStub().PutState(creditid, creditAsBytes)
	if err != nil {
		return err
	}
	return nil
}

func (t *SimpleChaincode) VerifyCredit(ctx contractapi.TransactionContextInterface, creditid string ) error {
	fmt.Println("- start Verify Credit")
	
	// 기등록 크레딧 검색
	creditAsBytes, err := ctx.GetStub().GetState(creditid)
	if err != nil {
		return fmt.Errorf("Failed to get credit: " + err.Error())
	} else if creditAsBytes == nil {
		return fmt.Errorf("This credit does not exist: " + creditid)
	}

	// 검증 
	// unmarshal 시키는거 먼저
	credit := LC{}
	_ = json.Unmarshal(creditAsBytes, &credit)

	credit.Status = "verified"

	creditAsBytes, err = json.Marshal(credit)
	if err != nil {
		return err
	}
	err = ctx.GetStub().PutState(creditid, creditAsBytes)
	if err != nil {
		return err
	}
	return nil
}


func (t *SimpleChaincode) ExcuteCredit(ctx contractapi.TransactionContextInterface, creditid string ) error {
	fmt.Println("- start Excute Credit")
	
	// 기등록 크레딧 검색
	creditAsBytes, err := ctx.GetStub().GetState(creditid)
	if err != nil {
		return fmt.Errorf("Failed to get credit: " + err.Error())
	} else if creditAsBytes == nil {
		return fmt.Errorf("This credit does not exist: " + creditid)
	}

	// 검증 해당 크레딧이 newOwner에게 transfer approve 되었나?
	// unmarshal 시키는거 먼저
	credit := LC{}
	_ = json.Unmarshal(creditAsBytes, &credit)

	credit.Status = "excuted"

	creditAsBytes, err = json.Marshal(credit)
	if err != nil {
		return err
	}
	err = ctx.GetStub().PutState(creditid, creditAsBytes)
	if err != nil {
		return err
	}
	return nil
}


// GetHistoryForCredit 함수
func (t *SimpleChaincode) GetCreditHistory(ctx contractapi.TransactionContextInterface, creditid string) ([]HistoryQueryResult, error) {
	log.Printf("GetCreditHistory: ID %v", creditid)

	resultsIterator, err := ctx.GetStub().GetHistoryForKey(creditid)
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var records []HistoryQueryResult
	for resultsIterator.HasNext() {
		response, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var credit LC
		if len(response.Value) > 0 {
			err = json.Unmarshal(response.Value, &credit)
			if err != nil {
				return nil, err
			}
		} else {
			credit = LC{
				CreditId: creditid,
			}
		}

		timestamp, err := ptypes.Timestamp(response.Timestamp)
		if err != nil {
			return nil, err
		}

		record := HistoryQueryResult{
			TxId:      response.TxId,
			Timestamp: timestamp,
			Record:    &credit,
			IsDelete:  response.IsDelete,
		}
		records = append(records, record)
	}

	return records, nil
}

// main 함수
func main() {
	chaincode, err := contractapi.NewChaincode(&SimpleChaincode{})
	if err != nil {
		log.Panicf("Error creating credit chaincode: %v", err)
	}

	if err := chaincode.Start(); err != nil {
		log.Panicf("Error starting credit chaincode: %v", err)
	}
}

