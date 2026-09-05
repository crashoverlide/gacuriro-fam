import React, { useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Button,
  Grid,
  Paper,
} from "@mui/material";
import { ArrowBack, ChevronLeft, ChevronRight } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

function Scheduled() {
  const navigate = useNavigate();
  const [cursor, setCursor] = useState(new Date());

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthName = cursor.toLocaleString("en-US", { month: "long", year: "numeric" });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prev = () => setCursor(new Date(year, month - 1, 1));
  const next = () => setCursor(new Date(year, month + 1, 1));

  return (
    <Box minHeight="100vh" p={2}>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBack />
        </IconButton>
        <Typography fontWeight={700} fontSize={18} flex={1}>
          {monthName}
        </Typography>
        <IconButton onClick={prev}>
          <ChevronLeft />
        </IconButton>
        <Button size="small" variant="outlined" onClick={() => setCursor(new Date())}>
          Today
        </Button>
        <IconButton onClick={next}>
          <ChevronRight />
        </IconButton>
        <Button variant="contained" onClick={() => navigate("/create")}>
          Schedule content
        </Button>
      </Box>

      <Grid container spacing={1}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <Grid item xs={12 / 7} key={d}>
            <Typography align="center" color="text.secondary" fontSize={12}>
              {d}
            </Typography>
          </Grid>
        ))}
        {cells.map((d, i) => (
          <Grid item xs={12 / 7} key={i}>
            <Paper
              sx={{
                minHeight: 80,
                p: 1,
                bgcolor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography fontSize={13}>{d || ""}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export default Scheduled;