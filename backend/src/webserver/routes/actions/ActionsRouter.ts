import { z } from "zod";
import { ActionSet } from "../../../database/models/actions/ActionSet.model";
import { AbstractRouter } from "../../AbstractRouter";
import { ProtogenWebServer } from "../../ProtogenWebServer";
import { ActionType } from "../../../actions/ActionType";
import { ActionSetAction } from "../../../database/models/actions/ActionSetEntry.model";
import { Equal, Not } from "typeorm";

export class ActionsRouter extends AbstractRouter {
  constructor(webServer: ProtogenWebServer) {
    super(webServer, "/actions");

    this.router.get("/", async (req, res) => {
      /*
      #swagger.path = '/actions'
      #swagger.tags = ['Actions'],
      #swagger.description = "Get all action sets"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[403] = { description: "Access denied" }
      #swagger.responses[500] = { description: "An internal error occured" }
      */

      try {
        const repo = this.protogen.database.dataSource.getRepository(ActionSet);
        const sets = await repo.find({
          relations: {
            actions: true,
          },
        });
        res.json(sets);
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.post("/", async (req, res) => {
      /*
      #swagger.path = '/actions'
      #swagger.tags = ['Actions'],
      #swagger.description = "Create a new action set"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request. See response for details" }
      #swagger.responses[403] = { description: "Access denied" }
      #swagger.responses[409] = { description: "Name already in use" }
      #swagger.responses[500] = { description: "An internal error occured" }
      */
      try {
        const parsed = AlterActionModel.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
          return;
        }

        const data = parsed.data;

        const repo = this.protogen.database.dataSource.getRepository(ActionSet);

        const existing = await repo.findOne({
          where: {
            name: data.name,
          },
        });
        if (existing != null) {
          res.status(409).send({ message: "Name already in use" });
          return;
        }

        const set = new ActionSet();
        set.name = data.name;
        set.showOnDashboard = data.showOnDashboard;
        set.actions = [];

        for (const action of data.actions) {
          const actionObj = new ActionSetAction();
          actionObj.type = action.type;
          actionObj.action = action.action;
          set.actions.push(actionObj);
        }

        const result = await repo.save(set);

        res.send(result);
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.put("/:id", async (req, res) => {
      /*
      #swagger.path = '/actions/{id}'
      #swagger.tags = ['Actions'],
      #swagger.description = "Update an action set"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Bad request. See response for details" }
      #swagger.responses[403] = { description: "Access denied" }
      #swagger.responses[404] = { description: "Action set not found" }
      #swagger.responses[409] = { description: "Action name already in use by other action" }
      #swagger.responses[500] = { description: "An internal error occured" }
      */
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          res.status(400).send({ message: "Invalid id provided" });
          return;
        }

        const parsed = AlterActionModel.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).send({ message: "Bad request: invalid request body", issues: parsed.error.issues });
          return;
        }

        const data = parsed.data;

        const repo = this.protogen.database.dataSource.getRepository(ActionSet);

        const nameConflict = await repo.findOne({
          where: {
            name: data.name,
            id: Not(Equal(id)),
          },
        });
        if (nameConflict != null) {
          res.status(409).send({ message: "Action name already in use by other action" });
          return;
        }

        const action = await repo.findOne({
          where: {
            id: id,
          },
          relations: {
            actions: true,
          }
        });
        if (action == null) {
          res.status(404).send({ message: "Action set not found" });
          return;
        }

        action.name = data.name;
        action.showOnDashboard = data.showOnDashboard;

        action.actions = action.actions.filter(a => data.actions.some((d) => d.id == a.id));

        for (const actionData of data.actions) {
          let actionObj = action.actions.find(a => a.id == actionData.id);
          if (actionObj == null) {
            actionObj = new ActionSetAction();
            action.actions.push(actionObj);
          }
          actionObj.action = actionData.action;
          actionObj.type = actionData.type;
        }

        const result = await repo.save(action);

        res.send(result);
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.delete("/:id", async (req, res) => {
      /*
      #swagger.path = '/actions/{id}'
      #swagger.tags = ['Actions'],
      #swagger.description = "Delete an action set"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Invalid id provided" }
      #swagger.responses[403] = { description: "Access denied" }
      #swagger.responses[404] = { description: "Action set not found" }
      #swagger.responses[500] = { description: "An internal error occured" }
      */
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          res.status(400).send({ message: "Invalid id provided" });
          return;
        }

        const repo = this.protogen.database.dataSource.getRepository(ActionSet);
        const action = await repo.findOne({
          where: {
            id: Equal(id),
          },
        });

        if (action == null) {
          res.status(404).send({ message: "Action set not found" });
          return;
        }

        await repo.remove(action);

        res.send({});
      } catch (err) {
        this.handleError(err, req, res);
      }
    });

    this.router.post("/:id/run", async (req, res) => {
      /*
      #swagger.path = '/actions/{id}/run'
      #swagger.tags = ['Actions'],
      #swagger.description = "Execute an action set"
      #swagger.responses[200] = { description: "Ok" }
      #swagger.responses[400] = { description: "Invalid id provided" }
      #swagger.responses[403] = { description: "Access denied" }
      #swagger.responses[404] = { description: "Action set not found" }
      #swagger.responses[500] = { description: "An internal error occured" }
      */
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          res.status(400).send({ message: "Invalid id provided" });
          return;
        }

        const repo = this.protogen.database.dataSource.getRepository(ActionSet);
        const action = await repo.findOne({
          where: {
            id: Equal(id),
          },
          relations: {
            actions: true,
          },
        });

        if (!action) {
          res.status(404).send({ message: "Action set not found" });
          return;
        }

        await this.protogen.actionManager.runActionSet(action.id);

        res.send(action);
      } catch (err) {
        this.handleError(err, req, res);
      }
    });
  }
}

const ActionModel = z.object({
  id: z.number().int().safe().positive().optional(),
  type: z.nativeEnum(ActionType),
  action: z.string().max(512).nullable(),
});

const AlterActionModel = z.object({
  name: z.string().max(32).trim().min(1),
  actions: z.array(ActionModel),
  showOnDashboard: z.boolean(),
});
