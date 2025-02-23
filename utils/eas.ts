import { EAS, SchemaEncoder } from "@ethereum-attestation-service/eas-sdk";
import { JsonRpcProvider, Wallet, getBytes, hexlify, zeroPadValue } from 'ethers';

// EAS contract address on Optimism
const EAS_CONTRACT_ADDRESS = "0x4200000000000000000000000000000000000021";

// Schema for vote allocations - registered on Optimism
const VOTE_ALLOCATION_SCHEMA = "bytes32 eventId,bytes32 projectId,string projectTitle,uint256 amount,bytes32 voterId,string username";

// Initialize provider and wallet
const provider = new JsonRpcProvider(process.env.OPTIMISM_RPC_URL);
const wallet = new Wallet(process.env.ETHEREUM_PRIVATE_KEY!, provider);

// Initialize EAS SDK
const eas = new EAS(EAS_CONTRACT_ADDRESS);
eas.connect(wallet);

// Schema encoder for vote allocations
const schemaEncoder = new SchemaEncoder(VOTE_ALLOCATION_SCHEMA);

export interface VoteAllocationAttestation {
  eventId: string;
  projectId: string;
  projectTitle: string;
  amount: number;
  voterId: string;
  username: string;
}

// Helper function to convert UUID to bytes32
function uuidToBytes32(uuid: string): string {
  // Remove hyphens and pad to 32 bytes
  const cleanUuid = uuid.replace(/-/g, '');
  return '0x' + cleanUuid.padStart(64, '0');
}

export type AttestationStatus = 'pending' | 'confirmed' | 'failed';

export interface AttestationResult {
  transactionHash: string | null;
  status: AttestationStatus;
  error: string | null;
}

export async function createVoteAllocationAttestation(data: VoteAllocationAttestation): Promise<AttestationResult> {
  try {
    console.log('Creating attestation with data:', data);
    console.log('Using schema:', VOTE_ALLOCATION_SCHEMA);
    console.log('Schema UID:', process.env.EAS_SCHEMA_UID);

    // Convert UUIDs to bytes32
    const eventIdBytes = uuidToBytes32(data.eventId);
    const projectIdBytes = uuidToBytes32(data.projectId);
    const voterIdBytes = uuidToBytes32(data.voterId);

    console.log('Converted IDs:', {
      eventIdBytes,
      projectIdBytes,
      voterIdBytes
    });

    // Encode the data
    const encodedData = schemaEncoder.encodeData([
      { name: "eventId", value: eventIdBytes, type: "bytes32" },
      { name: "projectId", value: projectIdBytes, type: "bytes32" },
      { name: "projectTitle", value: data.projectTitle, type: "string" },
      { name: "amount", value: data.amount, type: "uint256" },
      { name: "voterId", value: voterIdBytes, type: "bytes32" },
      { name: "username", value: data.username, type: "string" },
    ]);

    console.log('Encoded data:', encodedData);

    // Create the attestation
    console.log('Submitting attestation...');
    const tx = await eas.attest({
      schema: process.env.EAS_SCHEMA_UID!,
      data: {
        recipient: "0x0000000000000000000000000000000000000000",
        expirationTime: BigInt(0),
        revocable: false,
        data: encodedData,
      },
    });

    console.log('Transaction created:', tx);

    // Get the transaction hash
    const transactionHash = typeof tx === 'string' ? tx : tx.toString();
    console.log('Transaction hash:', transactionHash);

    // Return immediately with pending status and hash
    const result: AttestationResult = {
      transactionHash,
      status: 'pending',
      error: null
    };

    // Start confirmation process in background
    tx.wait().then(async (attestationUID) => {
      console.log('Transaction confirmed!');
      console.log('Attestation UID:', attestationUID);
      result.status = 'confirmed';
    }).catch(error => {
      console.error('Attestation confirmation failed:', error);
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : 'Unknown error occurred';
    });

    return result;

  } catch (error: unknown) {
    console.error("Failed to create attestation:", error);
    return {
      transactionHash: null,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
} 