import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
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
  let seeds = [sender.toBytes(), receiver.toBytes(), Buffer.from("conversation_tracker")];
  return await anchor.web3.PublicKey.findProgramAddress(seeds, programId);
}

export const createMessagePda = async (
  programId: anchor.web3.PublicKey,
  sender: anchor.web3.PublicKey,
  receiver: anchor.web3.PublicKey,
  messageNonce: number
): Promise<[anchor.web3.PublicKey, number]> => {
  let seeds = [sender.toBytes(), receiver.toBytes(), numberToLeBytes(messageNonce, 1), Buffer.from("conversation_message")];
  return await anchor.web3.PublicKey.findProgramAddress(seeds, programId);
}

describe("conversation", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const program = anchor.workspace.Conversation as Program<Conversation>;

  // const alice = (program.provider as anchor.AnchorProvider).wallet;
  const alice = anchor.web3.Keypair.generate();
  const bob = anchor.web3.Keypair.generate();

  // program.provider.connection.requestAirdrop(alice.publicKey, anchor.web3.LAMPORTS_PER_SOL * 1000);
  // program.provider.connection.requestAirdrop(bob.publicKey, anchor.web3.LAMPORTS_PER_SOL * 1000);

  // the index is message_nonce of the message PDA account
  const messages: anchor.web3.PublicKey[] = [];
  let conversationTracker: anchor.web3.PublicKey = null;
  let conversationTrackerBumpSeed: number = null;
  const systemProgram = anchor.web3.SystemProgram.programId;

  it("Alice initialized conversation", async () => {
    let initializer = alice.publicKey;
    let initializedWith = bob.publicKey;
    let [conversationTracker, conversationTrackerBumpSeed] = await createConversationTrackerPda(program.programId, alice.publicKey, bob.publicKey);
    
    let tx = await program.methods.initialize().accounts({
      initializer,
      initializedWith,
      conversationTracker
    })
    .signers([alice])
    .rpc();
    
    // let trackerData = await program.account.conversationTracker.fetch(conversationTracker);

    // expect(trackerData.conversationalists[0]).to.equal(alice.publicKey);
    // expect(trackerData.conversationalists[1]).to.equal(bob.publicKey);
  });
});
