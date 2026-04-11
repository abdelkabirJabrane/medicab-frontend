import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class DbCheck {
    public static void main(String[] args) throws Exception {
        String url = "jdbc:mysql://localhost:3306/user_db?useSSL=false&serverTimezone=UTC";
        try (Connection conn = DriverManager.getConnection(url, "root", "Root");
             Statement stmt = conn.createStatement()) {
            System.out.println("Connected to MySQL.");
            ResultSet rs = stmt.executeQuery("SELECT user_id, role FROM user_roles");
            while (rs.next()) {
                System.out.println("User " + rs.getLong(1) + " -> " + rs.getString(2));
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
