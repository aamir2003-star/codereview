import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { Team } from '../models/Team';
import mongoose from 'mongoose';

export const teamController = {
  async createTeam(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const orgId = Array.isArray(req.params.orgId) ? req.params.orgId[0] : req.params.orgId;
      const { name, slug, description, repositories } = req.body;

      if (!name || !slug) {
        res.status(400).json({ error: 'Team name and slug are required' });
        return;
      }

      const team = await Team.create({
        organizationId: new mongoose.Types.ObjectId(orgId),
        name,
        slug,
        description,
        repositories: repositories || [],
        members: req.user
          ? [{ userId: new mongoose.Types.ObjectId(req.user.userId), role: 'lead' }]
          : [],
      });

      res.status(201).json({ team });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to create team' });
    }
  },

  async getOrgTeams(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const orgId = Array.isArray(req.params.orgId) ? req.params.orgId[0] : req.params.orgId;
      const teams = await Team.find({ organizationId: new mongoose.Types.ObjectId(orgId) })
        .populate('members.userId', 'username avatarUrl')
        .sort({ name: 1 });

      res.status(200).json({ teams });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch teams' });
    }
  },

  async addMemberToTeam(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { teamId } = req.params;
      const { userId, role } = req.body;

      const team = await Team.findById(teamId);
      if (!team) {
        res.status(404).json({ error: 'Team not found' });
        return;
      }

      const existing = team.members.find((m) => m.userId.toString() === userId);
      if (existing) {
        existing.role = role || 'member';
      } else {
        team.members.push({
          userId: new mongoose.Types.ObjectId(userId),
          role: role || 'member',
          addedAt: new Date(),
        });
      }

      await team.save();
      res.status(200).json({ team });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to add member to team' });
    }
  },

  async removeMemberFromTeam(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { teamId, memberId } = req.params;

      const team = await Team.findById(teamId);
      if (!team) {
        res.status(404).json({ error: 'Team not found' });
        return;
      }

      team.members = team.members.filter((m) => m.userId.toString() !== memberId);
      await team.save();

      res.status(200).json({ success: true, message: 'Member removed from team' });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to remove team member' });
    }
  },
};
