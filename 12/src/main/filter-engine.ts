import { DatabaseService } from './database';
import { FilterRule, FilterCondition, FilterAction, Email, EmailContact } from '../shared/types';

interface FilterMatchResult {
  matched: boolean;
  matchedConditions: FilterCondition[];
  failedConditions: FilterCondition[];
}

interface FilterExecutionResult {
  ruleId: string;
  ruleName: string;
  matched: boolean;
  actionsExecuted: FilterAction[];
  actionsFailed: FilterAction[];
  error?: string;
}

interface FilterRunOptions {
  stopOnFirstMatch?: boolean;
  dryRun?: boolean;
}

export class FilterEngine {
  private dbService: DatabaseService;

  constructor(dbService: DatabaseService) {
    this.dbService = dbService;
  }

  async getRules(): Promise<FilterRule[]> {
    try {
      const rules = await this.dbService.getFilters();
      return rules.sort((a, b) => a.priority - b.priority);
    } catch (error) {
      console.error('Failed to get filter rules:', error);
      throw error;
    }
  }

  async addRule(rule: Omit<FilterRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<FilterRule> {
    try {
      return await this.dbService.addFilter(rule);
    } catch (error) {
      console.error('Failed to add filter rule:', error);
      throw error;
    }
  }

  async updateRule(id: string, rule: Partial<FilterRule>): Promise<FilterRule> {
    try {
      return await this.dbService.updateFilter(id, rule);
    } catch (error) {
      console.error('Failed to update filter rule:', error);
      throw error;
    }
  }

  async deleteRule(id: string): Promise<void> {
    try {
      await this.dbService.deleteFilter(id);
    } catch (error) {
      console.error('Failed to delete filter rule:', error);
      throw error;
    }
  }

  async testRule(ruleId: string, emailId: string): Promise<FilterMatchResult> {
    try {
      const rule = await this.dbService.getFilter(ruleId);
      const email = await this.dbService.getEmail(emailId);

      if (!rule) {
        throw new Error('Filter rule not found');
      }

      if (!email) {
        throw new Error('Email not found');
      }

      return this.matchRule(rule, email);
    } catch (error) {
      console.error('Failed to test filter rule:', error);
      throw error;
    }
  }

  async runRule(ruleId: string, emailIds?: string[], options: FilterRunOptions = {}): Promise<FilterExecutionResult[]> {
    try {
      const rule = await this.dbService.getFilter(ruleId);
      if (!rule) {
        throw new Error('Filter rule not found');
      }

      const emails = await this.getApplicableEmails(rule, emailIds);
      const results: FilterExecutionResult[] = [];

      for (const email of emails) {
        const result = await this.executeRuleOnEmail(rule, email, options);
        results.push(result);

        if (options.stopOnFirstMatch && result.matched) {
          break;
        }
      }

      return results;
    } catch (error) {
      console.error('Failed to run filter rule:', error);
      throw error;
    }
  }

  async runAllRules(emailIds?: string[], options: FilterRunOptions = {}): Promise<FilterExecutionResult[]> {
    try {
      const rules = await this.getRules();
      const enabledRules = rules.filter(r => r.enabled);
      const allResults: FilterExecutionResult[] = [];

      for (const rule of enabledRules) {
        const emails = await this.getApplicableEmails(rule, emailIds);

        for (const email of emails) {
          const result = await this.executeRuleOnEmail(rule, email, options);
          allResults.push(result);
        }
      }

      return allResults;
    } catch (error) {
      console.error('Failed to run all filter rules:', error);
      throw error;
    }
  }

  async processIncomingEmail(email: Email): Promise<FilterExecutionResult[]> {
    try {
      const rules = await this.getRules();
      const enabledRules = rules.filter(r => r.enabled);
      const results: FilterExecutionResult[] = [];

      for (const rule of enabledRules) {
        if (this.isRuleApplicable(rule, email)) {
          const result = await this.executeRuleOnEmail(rule, email, { stopOnFirstMatch: true });
          results.push(result);

          if (result.matched) {
            break;
          }
        }
      }

      return results;
    } catch (error) {
      console.error('Failed to process incoming email with filters:', error);
      return [];
    }
  }

  private async getApplicableEmails(rule: FilterRule, emailIds?: string[]): Promise<Email[]> {
    try {
      let emails: Email[] = [];

      if (emailIds && emailIds.length > 0) {
        const emailPromises = emailIds.map(id => this.dbService.getEmail(id));
        const emailResults = await Promise.all(emailPromises);
        emails = emailResults.filter((e): e is Email => e !== null);
      } else {
        if (rule.folderIds.length > 0) {
          for (const folderId of rule.folderIds) {
            const { emails: folderEmails } = await this.dbService.getEmails(folderId, 1000);
            emails = [...emails, ...folderEmails];
          }
        } else if (rule.accountIds.length > 0) {
          for (const accountId of rule.accountIds) {
            const folders = await this.dbService.getFolders(accountId);
            for (const folder of folders) {
              const { emails: folderEmails } = await this.dbService.getEmails(folder.id, 1000);
              emails = [...emails, ...folderEmails];
            }
          }
        } else {
          const folders = await this.dbService.getFolders();
          for (const folder of folders) {
            const { emails: folderEmails } = await this.dbService.getEmails(folder.id, 1000);
            emails = [...emails, ...folderEmails];
          }
        }
      }

      return emails.filter(email => this.isRuleApplicable(rule, email));
    } catch (error) {
      console.error('Failed to get applicable emails:', error);
      return [];
    }
  }

  private isRuleApplicable(rule: FilterRule, email: Email): boolean {
    if (rule.accountIds.length > 0 && !rule.accountIds.includes(email.accountId)) {
      return false;
    }

    if (rule.folderIds.length > 0 && !rule.folderIds.includes(email.folderId)) {
      return false;
    }

    return true;
  }

  private matchRule(rule: FilterRule, email: Email): FilterMatchResult {
    const matchedConditions: FilterCondition[] = [];
    const failedConditions: FilterCondition[] = [];

    for (const condition of rule.conditions) {
      if (this.matchCondition(condition, email)) {
        matchedConditions.push(condition);
      } else {
        failedConditions.push(condition);
      }
    }

    let matched = false;
    if (rule.matchType === 'all') {
      matched = failedConditions.length === 0;
    } else {
      matched = matchedConditions.length > 0;
    }

    return {
      matched,
      matchedConditions,
      failedConditions
    };
  }

  private matchCondition(condition: FilterCondition, email: Email): boolean {
    const { field, operator, value } = condition;

    switch (field) {
      case 'from':
        return this.compareString(`${email.from.name} ${email.from.email}`, String(value), operator);
      case 'to':
        const toStr = email.to.map(t => `${t.name} ${t.email}`).join(' ');
        return this.compareString(toStr, String(value), operator);
      case 'subject':
        return this.compareString(email.subject, String(value), operator);
      case 'body':
        const bodyStr = `${email.body.plain || ''} ${email.body.html || ''}`;
        return this.compareString(bodyStr, String(value), operator);
      case 'date':
        return this.compareDate(email.date, Number(value), operator);
      case 'hasAttachment':
        return this.compareBoolean(email.attachments.length > 0, Boolean(value), operator);
      case 'size':
        return this.compareNumber(email.size, Number(value), operator);
      case 'label':
        return this.compareArray(email.labels, String(value), operator);
      default:
        return false;
    }
  }

  private compareString(source: string, target: string, operator: string): boolean {
    const sourceLower = source.toLowerCase();
    const targetLower = target.toLowerCase();

    switch (operator) {
      case 'equals':
        return sourceLower === targetLower;
      case 'contains':
        return sourceLower.includes(targetLower);
      case 'startsWith':
        return sourceLower.startsWith(targetLower);
      case 'endsWith':
        return sourceLower.endsWith(targetLower);
      case 'is':
        return sourceLower === targetLower;
      case 'isNot':
        return sourceLower !== targetLower;
      default:
        return false;
    }
  }

  private compareNumber(source: number, target: number, operator: string): boolean {
    switch (operator) {
      case 'equals':
        return source === target;
      case 'greaterThan':
        return source > target;
      case 'lessThan':
        return source < target;
      case 'is':
        return source === target;
      case 'isNot':
        return source !== target;
      default:
        return false;
    }
  }

  private compareDate(source: number, target: number, operator: string): boolean {
    return this.compareNumber(source, target, operator);
  }

  private compareBoolean(source: boolean, target: boolean, operator: string): boolean {
    switch (operator) {
      case 'is':
        return source === target;
      case 'isNot':
        return source !== target;
      default:
        return false;
    }
  }

  private compareArray(source: string[], target: string, operator: string): boolean {
    const targetLower = target.toLowerCase();
    const sourceLower = source.map(s => s.toLowerCase());

    switch (operator) {
      case 'contains':
        return sourceLower.some(s => s.includes(targetLower));
      case 'equals':
        return sourceLower.some(s => s === targetLower);
      case 'is':
        return sourceLower.some(s => s === targetLower);
      case 'isNot':
        return !sourceLower.some(s => s === targetLower);
      default:
        return false;
    }
  }

  private async executeRuleOnEmail(rule: FilterRule, email: Email, options: FilterRunOptions): Promise<FilterExecutionResult> {
    const matchResult = this.matchRule(rule, email);

    if (!matchResult.matched) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        matched: false,
        actionsExecuted: [],
        actionsFailed: []
      };
    }

    const actionsExecuted: FilterAction[] = [];
    const actionsFailed: FilterAction[] = [];
    let error: string | undefined;

    if (options.dryRun) {
      return {
        ruleId: rule.id,
        ruleName: rule.name,
        matched: true,
        actionsExecuted: rule.actions,
        actionsFailed: []
      };
    }

    for (const action of rule.actions) {
      try {
        await this.executeAction(action, email);
        actionsExecuted.push(action);
      } catch (actionError) {
        console.error(`Failed to execute action ${action.type}:`, actionError);
        actionsFailed.push(action);
        if (!error) {
          error = actionError instanceof Error ? actionError.message : 'Action failed';
        }
      }
    }

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      matched: true,
      actionsExecuted,
      actionsFailed,
      error
    };
  }

  private async executeAction(action: FilterAction, email: Email): Promise<void> {
    const { type, params } = action;

    switch (type) {
      case 'move':
        await this.actionMove(email, params);
        break;
      case 'copy':
        await this.actionCopy(email, params);
        break;
      case 'delete':
        await this.actionDelete(email);
        break;
      case 'markRead':
        await this.actionMarkRead(email);
        break;
      case 'markUnread':
        await this.actionMarkUnread(email);
        break;
      case 'star':
        await this.actionStar(email, params);
        break;
      case 'addLabel':
        await this.actionAddLabel(email, params);
        break;
      case 'removeLabel':
        await this.actionRemoveLabel(email, params);
        break;
      case 'forward':
        await this.actionForward(email, params);
        break;
      case 'reply':
        await this.actionReply(email, params);
        break;
      case 'markForwarded':
        await this.actionMarkForwarded(email);
        break;
      case 'markAnswered':
        await this.actionMarkAnswered(email);
        break;
      default:
        throw new Error(`Unknown action type: ${type}`);
    }
  }

  private async actionMove(email: Email, params: Record<string, any>): Promise<void> {
    const folderId = params.folderId as string;
    if (!folderId) {
      throw new Error('Folder ID is required for move action');
    }
    await this.dbService.updateEmail(email.id, { folderId });
  }

  private async actionCopy(email: Email, params: Record<string, any>): Promise<void> {
    const folderId = params.folderId as string;
    if (!folderId) {
      throw new Error('Folder ID is required for copy action');
    }

    const targetFolder = await this.dbService.getFolder(folderId);
    if (!targetFolder) {
      throw new Error('Target folder not found');
    }

    const attachments = await this.dbService.getAttachments(email.id);
    const newEmail: Omit<Email, 'id'> = {
      ...email,
      folderId,
      uid: Date.now()
    };

    await this.dbService.addEmail(newEmail, attachments);
  }

  private async actionDelete(email: Email): Promise<void> {
    await this.dbService.deleteEmail(email.id);
  }

  private async actionMarkRead(email: Email): Promise<void> {
    const updatedFlags = { ...email.flags, seen: true };
    await this.dbService.updateEmail(email.id, {
      isRead: true,
      flags: updatedFlags
    });
  }

  private async actionMarkUnread(email: Email): Promise<void> {
    const updatedFlags = { ...email.flags, seen: false };
    await this.dbService.updateEmail(email.id, {
      isRead: false,
      flags: updatedFlags
    });
  }

  private async actionStar(email: Email, params: Record<string, any>): Promise<void> {
    const starred = params.starred !== undefined ? Boolean(params.starred) : !email.isStarred;
    const updatedFlags = { ...email.flags, flagged: starred };
    await this.dbService.updateEmail(email.id, {
      isStarred: starred,
      flags: updatedFlags
    });
  }

  private async actionAddLabel(email: Email, params: Record<string, any>): Promise<void> {
    const labelId = params.labelId as string;
    if (!labelId) {
      throw new Error('Label ID is required for addLabel action');
    }
    await this.dbService.applyLabelToEmail(email.id, labelId);
  }

  private async actionRemoveLabel(email: Email, params: Record<string, any>): Promise<void> {
    const labelId = params.labelId as string;
    if (!labelId) {
      throw new Error('Label ID is required for removeLabel action');
    }
    await this.dbService.removeLabelFromEmail(email.id, labelId);
  }

  private async actionForward(email: Email, params: Record<string, any>): Promise<void> {
    const to = params.to as string;
    if (!to) {
      throw new Error('Recipient is required for forward action');
    }
    console.info(`Forwarding email ${email.id} to ${to}`);
  }

  private async actionReply(email: Email, params: Record<string, any>): Promise<void> {
    const template = params.template as string;
    console.info(`Auto-replying to email ${email.id} with template: ${template || 'default'}`);
  }

  private async actionMarkForwarded(email: Email): Promise<void> {
    const updatedFlags = { ...email.flags, forwarded: true };
    await this.dbService.updateEmail(email.id, { flags: updatedFlags });
  }

  private async actionMarkAnswered(email: Email): Promise<void> {
    const updatedFlags = { ...email.flags, answered: true };
    await this.dbService.updateEmail(email.id, { flags: updatedFlags });
  }
}
