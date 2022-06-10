import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SplTokenInstructionCoder } from "@project-serum/anchor/dist/cjs/coder/spl-token/instruction";
import { TOKEN_PROGRAM_ID } from "@project-serum/anchor/dist/cjs/utils/token";
import { BN } from "bn.js";
import { expect } from "chai";
import { Conversation } from "../target/types/conversation";

/**
 * 
 * @param num the number to make a BN of
 * @param length the number of bytes of the resulting buffer
 * @returns 
 */
export const numberToLeBytes = (num: number, length: number) => {
  const n = new anchor.BN(num);
  const buffer = n.toBuffer("le", length);
  return buffer;
};

export const createConversationTrackerPda = async (
  programId: anchor.web3.PublicKey,
  sender: anchor.web3.PublicKey,
  receiver: anchor.web3.PublicKey,
): Promise<[anchor.web3.PublicKey, number]> => {
  let seeds = [sender.toBuffer(), receiver.toBuffer(), anchor.utils.bytes.utf8.encode("conversation_tracker")];
  return await anchor.web3.PublicKey.findProgramAddress(seeds, programId);
}

export const createMessagePda = async (
  programId: anchor.web3.PublicKey,
  sender: anchor.web3.PublicKey,
  receiver: anchor.web3.PublicKey,
  messageNonce: number
): Promise<[anchor.web3.PublicKey, number]> => {
  let seeds = [sender.toBuffer(), receiver.toBuffer(), numberToLeBytes(messageNonce, 1), anchor.utils.bytes.utf8.encode("user-conversation_message")];
  return await anchor.web3.PublicKey.findProgramAddress(seeds, programId);
}

describe("conversation", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.Conversation as Program<Conversation>;
  const programProvider = program.provider as anchor.AnchorProvider;

  const bhai = anchor.web3.Keypair.generate();
  const initializer = programProvider.wallet.publicKey;
  const initializedWith = bhai.publicKey;

  // the index is message_nonce of the message PDA account
  const messages: anchor.web3.PublicKey[] = [];
  let conversationTracker: anchor.web3.PublicKey = null;
  let conversationTrackerBumpSeed: number = null;

  it("Alice initialized conversation with Bhai", async () => {
    let [conversationTracker, conversationTrackerBumpSeed] = await createConversationTrackerPda(program.programId, initializer, initializedWith);

    // program.methods.sendMessage("a messageee")
    let ix = await program.methods.initialize().accounts({
      initializer: initializer,
      // initializer: programProvider.wallet.publicKey,
      initializedWith: initializedWith,
      conversationTracker,
    }).signers([]).rpc();

    let trackerData = await program.account.conversationTracker.fetch(conversationTracker);
    expect(trackerData.bumpSeed).to.equal(conversationTrackerBumpSeed);

    expect(trackerData.initializer.toBase58()).to.equal(initializer.toBase58());
    expect(trackerData.initializedWith.toBase58()).to.equal(initializedWith.toBase58());
  });
});
