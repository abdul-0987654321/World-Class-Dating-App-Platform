import { MatchRepository } from '../repositories/match.repository';
import { UserRepository } from '../repositories/user.repository';
import { ProfileRepository } from '../repositories/profile.repository';
import { PhotoRepository } from '../repositories/photo.repository';
import { PromptRepository } from '../repositories/prompt.repository';
import { MatchResponse, MatchDetailResponse } from '../entities/Match.entity';

export class MatchService {
  private matchRepository: MatchRepository;
  private userRepository: UserRepository;
  private profileRepository: ProfileRepository;
  private photoRepository: PhotoRepository;
  private promptRepository: PromptRepository;

  constructor(
    matchRepository?: MatchRepository,
    userRepository?: UserRepository,
    profileRepository?: ProfileRepository,
    photoRepository?: PhotoRepository,
    promptRepository?: PromptRepository
  ) {
    this.matchRepository = matchRepository || new MatchRepository();
    this.userRepository = userRepository || new UserRepository();
    this.profileRepository = profileRepository || new ProfileRepository();
    this.photoRepository = photoRepository || new PhotoRepository();
    this.promptRepository = promptRepository || new PromptRepository();
  }

  async getUserMatches(userId: string): Promise<MatchResponse[]> {
    const matches = await this.matchRepository.findByUserId(userId, true);
    const matchResponses: MatchResponse[] = [];

    for (const match of matches) {
      const matchedUserId = match.user1_id === userId ? match.user2_id : match.user1_id;
      const matchedUser = await this.userRepository.findById(matchedUserId);
      const matchedProfile = await this.profileRepository.findByUserId(matchedUserId);
      const primaryPhoto = await this.photoRepository.getPrimaryPhoto(matchedUserId);

      if (!matchedUser) continue;

      const age = this.calculateAge(matchedUser.date_of_birth);

      matchResponses.push({
        id: match.id,
        matched_user: {
          id: matchedUser.id,
          first_name: matchedUser.first_name,
          last_name: matchedUser.last_name,
          age,
          bio: matchedProfile?.bio,
          primary_photo: primaryPhoto?.url,
          city: matchedProfile?.city,
        },
        matched_at: match.matched_at,
        is_active: match.is_active,
      });
    }

    return matchResponses;
  }

  async getMatchDetail(userId: string, matchId: string): Promise<MatchDetailResponse> {
    const match = await this.matchRepository.findById(matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    // Verify user is part of this match
    if (match.user1_id !== userId && match.user2_id !== userId) {
      throw new Error('Unauthorized to view this match');
    }

    const matchedUserId = match.user1_id === userId ? match.user2_id : match.user1_id;
    const matchedUser = await this.userRepository.findById(matchedUserId);
    const matchedProfile = await this.profileRepository.findByUserId(matchedUserId);
    const photos = await this.photoRepository.findByUserId(matchedUserId);
    const prompts = await this.promptRepository.findUserPrompts(matchedUserId);

    if (!matchedUser) {
      throw new Error('Matched user not found');
    }

    const age = this.calculateAge(matchedUser.date_of_birth);

    return {
      id: match.id,
      matched_user: {
        id: matchedUser.id,
        first_name: matchedUser.first_name,
        last_name: matchedUser.last_name,
        age,
        bio: matchedProfile?.bio,
        photos: photos.map((p) => p.url),
        city: matchedProfile?.city,
        occupation: matchedProfile?.occupation,
        interests: matchedProfile?.interests || [],
        prompts: prompts.map((p) => ({
          question: p.question,
          answer: p.answer,
        })),
      },
      matched_at: match.matched_at,
      is_active: match.is_active,
    };
  }

  async unmatch(userId: string, matchId: string): Promise<void> {
    const match = await this.matchRepository.findById(matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    // Verify user is part of this match
    if (match.user1_id !== userId && match.user2_id !== userId) {
      throw new Error('Unauthorized to unmatch');
    }

    await this.matchRepository.unmatch(matchId, userId);
  }

  async getMatchStats(userId: string): Promise<any> {
    const activeMatches = await this.matchRepository.countActiveMatches(userId);
    const recentMatches = await this.matchRepository.getRecentMatches(userId, 7);

    return {
      total_matches: activeMatches,
      matches_this_week: recentMatches.length,
    };
  }

  async checkMatchExists(user1Id: string, user2Id: string): Promise<boolean> {
    return this.matchRepository.checkMatchExists(user1Id, user2Id);
  }

  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }
}
