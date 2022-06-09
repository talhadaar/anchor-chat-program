use anchor_lang::prelude::*;

declare_id!("8xMGj9G2hYRAfgdkG45xqmWCMmh6pb4agu26REJC9LsX");

pub const MAX_MESSAGE_LENGTH: usize = 32;

#[program]
pub mod conversation {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        ctx.accounts.conversation_tracker.conversationalists[0] = ctx.accounts.initializer.key();
        ctx.accounts.conversation_tracker.conversationalists[1] = ctx.accounts.initialized_with.key();
        ctx.accounts.conversation_tracker.bump_seed =
            *ctx.bumps.get("conversation_tracker").unwrap();
        Ok(())
    }

    pub fn send_message(ctx: Context<SendMessage>, message: String) -> Result<()> {
        require!(
            message.len() < MAX_MESSAGE_LENGTH,
            ConversationError::MessageLengthOverflow
        );
        ctx.accounts.message.message = message;
        ctx.accounts.message.bump_seed = *ctx.bumps.get("message").unwrap();
        ctx.accounts.conversation_tracker.conversation_nonce += 1;
        Ok(())
    }

    /// Empties out the message string, but the account record remains
    pub fn delete_message(ctx: Context<DeleteMessage>) -> Result<()> {
        ctx.accounts.message.message.clear();
        Ok(())
    }
}

#[error_code]
pub enum ConversationError {
    #[msg("Message length limit exeeded")]
    MessageLengthOverflow,
}

// #[instruction(initialized_with: Pubkey)] // TODO this should be equal to the decoded instruction_data?
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub initializer: Signer<'info>,
    /// CHECK: is not read or written to
    #[account()]
    pub initialized_with: AccountInfo<'info>,
    #[account(
        init,
        payer = initializer,
        space = ConversationTracker::SIZE,
        seeds = [
            initializer.key().as_ref(),
            initialized_with.key().as_ref(),
            b"conversation_tracker"
            ],
            bump
        )]
    pub conversation_tracker: Account<'info, ConversationTracker>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct ConversationTracker {
    pub conversationalists: [Pubkey; 2],
    pub conversation_nonce: u8,
    pub bump_seed: u8,
}
impl ConversationTracker {
    pub const SIZE: usize = std::mem::size_of::<ConversationTracker>();
}

#[derive(Accounts)]
#[instruction(receiver: Pubkey)]
pub struct SendMessage<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,
    #[account(
            mut,
            constraint =
            conversation_tracker.conversationalists.contains(sender.key) && conversation_tracker.conversationalists.contains(&receiver),
            seeds = [
                sender.key().as_ref(),
                receiver.as_ref(),
                b"conversation_tracker"
            ],
            bump
        )]
    pub conversation_tracker: Account<'info, ConversationTracker>,
    #[account(
        init,
        payer = sender,
        space = Message::SIZE,
        seeds =[
            sender.key().as_ref(),
            receiver.key().as_ref(),
            &[conversation_tracker.conversation_nonce],
            b"conversation_message"
            ],
        bump,
        )]
    pub message: Account<'info, Message>,
    #[account()]
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(receiver: Pubkey)]
pub struct DeleteMessage<'info> {
    #[account(mut)]
    pub sender: Signer<'info>,
    #[account(
        mut,
        constraint =
        conversation_tracker.conversationalists.contains(sender.key) && conversation_tracker.conversationalists.contains(&receiver)
    )]
    pub conversation_tracker: Account<'info, ConversationTracker>,
    #[account(
        mut,
        seeds =[
        sender.key().as_ref(),
        receiver.key().as_ref(),
        &[conversation_tracker.conversation_nonce],
        b"conversation_message"
        ],
        bump,
    )]
    pub message: Account<'info, Message>,
}

#[account]
pub struct Message {
    pub message: String,
    pub bump_seed: u8,
}
impl Message {
    pub const SIZE: usize = std::mem::size_of::<Message>();
}
