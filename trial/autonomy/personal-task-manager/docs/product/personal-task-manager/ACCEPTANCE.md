# Feature Contract — Personal Task Manager

Status: draft, awaiting founder approval. Prototype reference: proposed single task-list screen.

| ID | Given | When | Then |
|---|---|---|---|
| AC-01 | This browser has no saved tasks | The person opens the task list | They see “No tasks yet” and a task entry field |
| AC-02 | The list has fewer than 100 tasks | They add “  Buy milk  ” | An open task appears titled “Buy milk” |
| AC-03 | The task title contains only spaces | They try to add it | “Enter a task title” appears and the list is unchanged |
| AC-04 | A task is open | They mark it complete | The task is shown as complete |
| AC-05 | A task is complete | They reopen it | The task is shown as open |
| AC-06 | Tasks have been saved | They reload in the same browser | Their titles and completion states reappear |
| AC-07 | The list already contains 100 tasks | They try to add another | “Task limit reached (100)” appears and the list is unchanged |
| AC-08 | The browser refuses to save a change | They submit the change | A save error appears and the previously saved list stays visible |
| AC-09 | The saved list cannot be read | They open the app | A read error appears and task changes are disabled |
| AC-10 | The screen is already loaded and the browser goes offline | They add a valid task | The task is added and saved in that browser |
| AC-11 | A title exceeds 120 characters after trimming | They try to add it | “Use 120 characters or fewer” appears and the list is unchanged |

The screen reads only local browser data. It has no remote loading step or account permissions. Browser storage denial is covered by AC-08 and AC-09. An initial visit to a hosted preview requires connectivity. Tasks get no cross-tab conflict resolution in this slice. Task text stays in the preview browser and is displayed as plain text.

Engineering choices are delegated within this contract. Changes to user-visible behavior require a recorded founder decision before affected acceptance tests or implementation proceed.
